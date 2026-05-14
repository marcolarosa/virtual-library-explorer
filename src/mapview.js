/**
 * mapview.js — Three.js spinning globe
 *
 * Single WebGLRenderer. Source anchors are raycasted on click;
 * results are shown in a sidebar panel owned by ui.js.
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { SOURCES } from "./sources.js";
import { on, emit } from "./bus.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const GLOBE_RADIUS = 100;
const CAMERA_DISTANCE = 280;

// ─── Module-level state ───────────────────────────────────────────────────────

let scene, renderer, camera, controls, container;
let animFrameId = null;
let graphUpdateHandler = null;

const anchorMeshes = new Map(); // sourceId -> THREE.Mesh
const sourcesWithData = new Set(); // sourceIds that have returned data

// ─── Coordinate helpers ───────────────────────────────────────────────────────

// Mirrors Three.js SphereGeometry vertex formula exactly:
//   x = -r·cos(phi)·sin(theta),  y = r·cos(theta),  z = r·sin(phi)·sin(theta)
// where phi = azimuthal (u·2π, u=(lng+180)/360) and theta = polar (v·π, v=(90-lat)/180)
function lngLatToVec3(lng, lat, r = GLOBE_RADIUS) {
    const phi   = (lng + 180) * (Math.PI / 180);  // azimuthal, matches sphere u
    const theta = (90 - lat)  * (Math.PI / 180);  // polar, matches sphere v
    return new THREE.Vector3(
        -r * Math.cos(phi) * Math.sin(theta),
         r * Math.cos(theta),
         r * Math.sin(phi) * Math.sin(theta),
    );
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initMap(cont) {
    container = cont;
    const w = container.clientWidth;
    const h = container.clientHeight;

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020810);

    // Camera
    camera = new THREE.PerspectiveCamera(45, w / h, 1, 2000);
    camera.position.set(0, 0, CAMERA_DISTANCE);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(w, h);
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.left = "0";
    container.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(5, 3, 5);
    scene.add(sun);

    // Globe sphere
    const globeGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
    const globeMat = new THREE.MeshPhongMaterial({ color: 0x1a3a5c });
    const globe = new THREE.Mesh(globeGeo, globeMat);
    scene.add(globe);

    // Load equirectangular map texture; fallback to solid colour on error
    new THREE.TextureLoader().load(
        "assets/world-map.png",
        (tex) => { globeMat.map = tex; globeMat.color.set(0xffffff); globeMat.needsUpdate = true; },
        undefined,
        () => {},
    );

    // Thin atmosphere glow
    const atmMat = new THREE.MeshPhongMaterial({
        color: 0x2255aa, transparent: true, opacity: 0.12, side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(GLOBE_RADIUS * 1.02, 64, 64), atmMat));

    // OrbitControls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping  = true;
    controls.dampingFactor  = 0.06;
    controls.minDistance    = GLOBE_RADIUS + 20;
    controls.maxDistance    = GLOBE_RADIUS * 5;
    controls.autoRotate     = true;
    controls.autoRotateSpeed = 0.4;

    // Source anchors
    _createSourceAnchors();

    // Raycasting
    const raycaster = new THREE.Raycaster();
    const pointer   = new THREE.Vector2();
    renderer.domElement.addEventListener("click", (e) => {
        controls.autoRotate = false;

        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x  =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
        pointer.y  = -((e.clientY - rect.top)  / rect.height) * 2 + 1;

        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects([...anchorMeshes.values()], false);
        if (hits.length > 0) {
            emit("source:select", hits[0].object.userData.sourceId);
        } else {
            emit("background:click", null);
        }
    });

    // Bus
    graphUpdateHandler = () => {};
    on("graph:update", graphUpdateHandler);
    on("source:status", (event) => {
        if (event.status === "done" && event.count > 0) {
            sourcesWithData.add(event.sourceId);
        } else if (event.status === "error") {
            sourcesWithData.delete(event.sourceId);
        }
    });

    window.addEventListener("resize", _onResize);
    _startRenderLoop();
}

// ─── Anchor creation ──────────────────────────────────────────────────────────

function _createSourceAnchors() {
    for (const source of SOURCES) {
        if (source.lat == null || source.lng == null) continue;

        const pos = lngLatToVec3(source.lng, source.lat);
        const col = new THREE.Color(source.color);

        // Dot on surface
        const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(2, 12, 12),
            new THREE.MeshBasicMaterial({ color: col }),
        );
        mesh.position.copy(pos);
        mesh.userData = { sourceId: source.id };
        scene.add(mesh);
        anchorMeshes.set(source.id, mesh);

        // Small spike pointing radially outward
        const spike = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0, 6, 6),
            new THREE.MeshBasicMaterial({ color: col }),
        );
        const outward = pos.clone().normalize();
        spike.position.copy(outward.clone().multiplyScalar(GLOBE_RADIUS + 3));
        spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), outward);
        scene.add(spike);
    }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

/** Kept for call-site compatibility — sidebar is managed by ui.js. */
export function syncAllSourceCards() {}

/** Clear is handled by ui.js reset flow; globe state needs no cleanup. */
export function clearMap() {}

export function zoomToFit() {
    if (!camera || !controls) return;
    camera.position.set(0, 0, CAMERA_DISTANCE);
    controls.target.set(0, 0, 0);
    controls.update();
}

/** No-op — ui.js reads state.nodes directly. */
export function refreshMap() {}

// ─── Render loop ──────────────────────────────────────────────────────────────

function _startRenderLoop() {
    function loop() {
        animFrameId = requestAnimationFrame(loop);
        controls.update();

        // Show anchors only on the near side of the globe and only if source has data
        for (const mesh of anchorMeshes.values()) {
            const sourceId = mesh.userData.sourceId;
            const facingCamera = mesh.position.dot(camera.position) > 0;
            mesh.visible = facingCamera && sourcesWithData.has(sourceId);
        }

        renderer.render(scene, camera);
    }
    loop();
}

function _onResize() {
    if (!container || !camera || !renderer) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
}
