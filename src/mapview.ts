import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { SOURCES, getRegionColor } from "./sources";
import { useSourcesStore } from "./stores/sources";
import { useUIStore } from "./stores/ui";
import { useLocationsStore } from "./stores/locations";
import { runSearch } from "./services/search";

const GLOBE_RADIUS = 100;
const CAMERA_DISTANCE = 280;

interface PulseConfig {
  activeRingCount: number
  activeRingLifetime: number
  activeRingDelay: number
  activeGlowIntensity: number
  steadyRingLifetime: number
  steadyRingDelay: number
  steadyGlowIntensity: number
  maxRingRadius: number
}

const PULSE_CONFIG: PulseConfig = {
    activeRingCount: 3,
    activeRingLifetime: 1200,
    activeRingDelay: 600,
    activeGlowIntensity: 2.0,
    steadyRingLifetime: 2000,
    steadyRingDelay: 800,
    steadyGlowIntensity: 0.8,
    maxRingRadius: 12,
};

interface PulseState {
  isSearching: boolean
  nextRingTime: number
}

interface RingMesh {
  mesh: THREE.Mesh
  sourceId: string
  startTime: number
  startRadius: number
}

let scene: THREE.Scene | null = null;
let renderer: THREE.WebGLRenderer | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let controls: OrbitControls | null = null;
let container: HTMLElement | null = null;
let animFrameId: number | null = null;

const anchorMeshes = new Map<string, THREE.Mesh>();
const sourcesWithData = new Set<string>();
const pulseStates = new Map<string, PulseState>();
const ringMeshes: RingMesh[] = [];

let raycaster: THREE.Raycaster | null = null;
let pointer: THREE.Vector2 | null = null;
let hoveredAnchorId: string | null = null;

function lngLatToVec3(lng: number, lat: number, r: number = GLOBE_RADIUS): THREE.Vector3 {
    const phi = (lng + 180) * (Math.PI / 180);
    const theta = (90 - lat) * (Math.PI / 180);
    return new THREE.Vector3(
        -r * Math.cos(phi) * Math.sin(theta),
         r * Math.cos(theta),
         r * Math.sin(phi) * Math.sin(theta),
    );
}

export function initMap(cont: HTMLElement): void {
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

    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();

    renderer!.domElement.addEventListener("mousemove", (e: MouseEvent) => {
        const rect = renderer!.domElement.getBoundingClientRect();
        pointer!.x  =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
        pointer!.y  = -((e.clientY - rect.top)  / rect.height) * 2 + 1;

        raycaster!.setFromCamera(pointer!, camera!);
        const hits = raycaster!.intersectObjects([...anchorMeshes.values()], false);

        if (hits.length > 0 && !(hits[0].object as any).userData.isSpike) {
            const anchorId = (hits[0].object as any).userData.sourceId;
            if (hoveredAnchorId !== anchorId) {
                hoveredAnchorId = anchorId;
                renderer!.domElement.style.cursor = "pointer";
            }
        } else {
            if (hoveredAnchorId !== null) {
                hoveredAnchorId = null;
                renderer!.domElement.style.cursor = "default";
            }
        }
    });

    renderer!.domElement.addEventListener("click", (e: MouseEvent) => {
        controls!.autoRotate = false;

        const rect = renderer!.domElement.getBoundingClientRect();
        pointer!.x  =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
        pointer!.y  = -((e.clientY - rect.top)  / rect.height) * 2 + 1;

        raycaster!.setFromCamera(pointer!, camera!);
        const hits = raycaster!.intersectObjects([...anchorMeshes.values()], false);
        if (hits.length > 0) {
            const sourceId = (hits[0].object as any).userData.sourceId;
            focusSource(sourceId);

            const uiStore = useUIStore();
            uiStore.selectLocation(sourceId);
        }
    });

    _setupSourceStatusWatcher();

    window.addEventListener("resize", _onResize);
    _startRenderLoop();
}

function _setupSourceStatusWatcher(): void {
    const sourcesStore = useSourcesStore();
}

export function handleSourceStatusChange(sourceId: string, status: string): void {
    if (!sourceId) return;
    const sourcesStore = useSourcesStore();
    const statusData = sourcesStore.getStatus(sourceId);

    if (status === "querying") {
        if (!pulseStates.has(sourceId)) {
            pulseStates.set(sourceId, {
                isSearching: true,
                nextRingTime: Date.now(),
            });
        } else {
            pulseStates.get(sourceId)!.isSearching = true;
        }
        const anchor = anchorMeshes.get(sourceId);
        if (anchor?.userData.material) {
            (anchor.userData.material as THREE.Material & { emissiveIntensity: number }).emissiveIntensity = PULSE_CONFIG.activeGlowIntensity;
        }
    } else if (status === "done") {
        if (statusData.count > 0) {
            sourcesWithData.add(sourceId);
            if (!pulseStates.has(sourceId)) {
                pulseStates.set(sourceId, {
                    isSearching: false,
                    nextRingTime: Date.now(),
                });
            } else {
                pulseStates.get(sourceId)!.isSearching = false;
            }
            const anchor = anchorMeshes.get(sourceId);
            if (anchor?.userData.material) {
                (anchor.userData.material as THREE.Material & { emissiveIntensity: number }).emissiveIntensity = PULSE_CONFIG.steadyGlowIntensity;
            }
        } else {
            sourcesWithData.delete(sourceId);
            pulseStates.delete(sourceId);
            const anchor = anchorMeshes.get(sourceId);
            if (anchor?.userData.material) {
                (anchor.userData.material as THREE.Material & { emissiveIntensity: number }).emissiveIntensity = 0;
            }
            for (let i = ringMeshes.length - 1; i >= 0; i--) {
                if (ringMeshes[i].sourceId === sourceId) {
                    scene!.remove(ringMeshes[i].mesh);
                    ringMeshes[i].mesh.geometry.dispose();
                    (ringMeshes[i].mesh.material as THREE.Material).dispose();
                    ringMeshes.splice(i, 1);
                }
            }
        }
    } else if (status === "error") {
        sourcesWithData.delete(sourceId);
        pulseStates.delete(sourceId);
        const anchor = anchorMeshes.get(sourceId);
        if (anchor?.userData.material) {
            (anchor.userData.material as THREE.Material & { emissiveIntensity: number }).emissiveIntensity = 0;
        }
        for (let i = ringMeshes.length - 1; i >= 0; i--) {
            if (ringMeshes[i].sourceId === sourceId) {
                scene!.remove(ringMeshes[i].mesh);
                ringMeshes[i].mesh.geometry.dispose();
                (ringMeshes[i].mesh.material as THREE.Material).dispose();
                ringMeshes.splice(i, 1);
            }
        }
    }
}

function _createRing(sourceId: string, sourceColor: THREE.Color): RingMesh {
    const geometry = new THREE.TorusGeometry(0.5, 0.15, 8, 32);
    const material = new THREE.MeshBasicMaterial({
        color: sourceColor,
        transparent: true,
        opacity: 1.0,
    });
    const ring = new THREE.Mesh(geometry, material);

    const source = SOURCES.find(s => s.id === sourceId);
    if (!source) throw new Error(`Source ${sourceId} not found`);

    const pos = lngLatToVec3(source.lng, source.lat);
    ring.position.copy(pos);
    ring.lookAt(pos.clone().normalize().multiplyScalar(200));

    scene!.add(ring);

    return {
        mesh: ring,
        sourceId,
        startTime: Date.now(),
        startRadius: 0.5,
    };
}

function _updatePulseAnimations(): void {
    const now = Date.now();

    for (let i = ringMeshes.length - 1; i >= 0; i--) {
        const ring = ringMeshes[i];
        const sourceId = ring.sourceId;
        const state = pulseStates.get(sourceId);
        const isSearching = state?.isSearching ?? false;
        const lifetime = isSearching ? PULSE_CONFIG.activeRingLifetime : PULSE_CONFIG.steadyRingLifetime;

        const elapsed = now - ring.startTime;
        const progress = Math.min(elapsed / lifetime, 1);

        const radius = ring.startRadius + (PULSE_CONFIG.maxRingRadius - ring.startRadius) * progress;
        ring.mesh.scale.set(radius, radius, radius);

        (ring.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - progress;

        if (progress >= 1) {
            scene!.remove(ring.mesh);
            ring.mesh.geometry.dispose();
            (ring.mesh.material as THREE.Material).dispose();
            ringMeshes.splice(i, 1);
        }
    }

    for (const [sourceId, state] of pulseStates) {
        if (!state.isSearching && ringMeshes.filter(r => r.sourceId === sourceId).length === 0) {
            continue;
        }

        if (now >= state.nextRingTime) {
            const source = SOURCES.find(s => s.id === sourceId);
            if (source && source.lat != null && source.lng != null) {
                const color = new THREE.Color(getRegionColor(source.region));
                const ring = _createRing(sourceId, color);
                ringMeshes.push(ring);

                const delay = state.isSearching ? PULSE_CONFIG.activeRingDelay : PULSE_CONFIG.steadyRingDelay;
                state.nextRingTime = now + delay;
            }
        }
    }
}

function _createSourceAnchors(): void {
    for (const source of SOURCES) {
        if (source.lat == null || source.lng == null) continue;

        const pos = lngLatToVec3(source.lng, source.lat);
        const col = new THREE.Color(getRegionColor(source.region));

        const material = new THREE.MeshStandardMaterial({
            color: col,
            emissive: col,
            emissiveIntensity: 0,
            metalness: 0,
            roughness: 1,
        });
        const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(4, 12, 12),
            material,
        );
        mesh.position.copy(pos);
        mesh.userData = { sourceId: source.id, material };
        scene!.add(mesh);
        anchorMeshes.set(source.id, mesh);

        const spikeMaterial = new THREE.MeshStandardMaterial({
            color: col,
            emissive: col,
            emissiveIntensity: 0,
            metalness: 0,
            roughness: 1,
        });
        const spike = new THREE.Mesh(
            new THREE.CylinderGeometry(0.6, 0, 12, 6),
            spikeMaterial,
        );
        const outward = pos.clone().normalize();
        spike.position.copy(outward.clone().multiplyScalar(GLOBE_RADIUS + 3));
        spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), outward);
        spike.userData = { sourceId: source.id, material: spikeMaterial, isSpike: true };
        scene!.add(spike);
    }
}

export function syncAllSourceCards(): void {}

export function clearMap(): void {}

export function zoomToFit(): void {
    if (!camera || !controls) return;
    camera.position.set(0, 0, CAMERA_DISTANCE);
    controls.target.set(0, 0, 0);
    controls.update();
}

export function focusSource(sourceId: string): void {
    const source = SOURCES.find(s => s.id === sourceId);
    if (!source || source.lat == null || source.lng == null) return;

    const targetPos = lngLatToVec3(source.lng, source.lat);
    const direction = targetPos.clone().normalize();
    const cameraPos = direction.multiplyScalar(CAMERA_DISTANCE);

    controls!.autoRotate = false;

    const startPos = camera!.position.clone();
    const startTarget = controls!.target.clone();
    const duration = 2000;
    const startTime = Date.now();

    const animate = (): void => {
        const elapsed = Date.now() - startTime;
        const t = Math.min(elapsed / duration, 1);

        camera!.position.lerpVectors(startPos, cameraPos, t);
        controls!.target.lerpVectors(startTarget, targetPos, t);
        controls!.update();

        if (t < 1) {
            requestAnimationFrame(animate);
        } else {
            controls!.target.set(0, 0, 0);
            controls!.autoRotate = true;
            controls!.update();
        }
    };
    animate();
}

export function refreshMap(): void {}

function _startRenderLoop(): void {
    function loop(): void {
        animFrameId = requestAnimationFrame(loop);
        controls!.update();

        _updatePulseAnimations();

        for (const mesh of anchorMeshes.values()) {
            const sourceId = mesh.userData.sourceId;
            const facingCamera = mesh.position.dot(camera!.position) > 0;
            mesh.visible = facingCamera && sourcesWithData.has(sourceId);
        }

        renderer!.render(scene!, camera!);
    }
    loop();
}

function _onResize(): void {
    if (!container || !camera || !renderer) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
}

export function cleanup(): void {
    if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
    }

    for (const ring of ringMeshes) {
        scene!.remove(ring.mesh);
        ring.mesh.geometry.dispose();
        (ring.mesh.material as THREE.Material).dispose();
    }
    ringMeshes.length = 0;

    for (const mesh of anchorMeshes.values()) {
        scene!.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
    }
    anchorMeshes.clear();

    if (renderer) {
        renderer.dispose();
        if (container && renderer.domElement.parentNode === container) {
            container.removeChild(renderer.domElement);
        }
    }

    scene = null;
    renderer = null;
    camera = null;
    controls = null;
    container = null;
}
