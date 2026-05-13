# World Map View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 3D force-directed graph with a Three.js world map view that anchors library source results as browsable card fans above their real-world geographic locations.

**Architecture:** Two stacked renderers share `#graph-container` — a `WebGLRenderer` for the map plane (bottom, pointer-events:none) and a `CSS3DRenderer` for interactive HTML cards (top). Source anchors are cylinder meshes hit-tested via raycasting on CSS3D canvas click events. Cards are `CSS3DObject` wrappers around divs, laid out in a 120° fan arc around each anchor.

**Tech Stack:** Three.js r163 (ES module importmap, no build step), CSS3DRenderer addon, MapControls addon. No test framework — manual browser verification.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `index.html` | Modify | Swap CDN tag for Three.js importmap; remove `#pause-physics` button |
| `src/sources.js` | Modify | Add `lat`/`lng` to each SOURCES entry |
| `assets/world-map.jpg` | Create | Equirectangular earth texture (downloaded) |
| `src/mapview.js` | Create | Three.js scene, renderers, anchor meshes, CSS3D cards, fan layout, pagination, raycasting |
| `src/state.js` | Modify | Remove `edges`, `physicsPaused`, `linkModeActive`, `linkModeSourceNode` |
| `src/search.js` | Modify | Remove all edge-building, `inferCrossSourceEdges`, `addUserLink`, `makeQueryNode`/`makeSourceAnchor`/`addToGraph`/`clearGraph` usage; emit `graph:update` instead |
| `src/collection.js` | Modify | Remove graph.js imports; strip edge logic from export/import; use `clearMap` + `graph:update` |
| `src/ui.js` | Modify | Remove link-mode handlers, pause-physics handler, `refreshGraph` calls, dead imports |
| `src/main.js` | Modify | Swap `initGraph`/`clearGraph`/`getGraph` for `initMap`/`clearMap`/`zoomToFit` |
| `src/graph.js` | Delete | Replaced by `mapview.js` |

---

## Task 1: HTML — swap CDN and remove physics button

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Replace the `3d-force-graph` script tag with a Three.js importmap**

  Find this block near the bottom of `index.html`:
  ```html
  <!-- CDN dependencies — load before app modules -->
  <script src="https://cdn.jsdelivr.net/npm/3d-force-graph/dist/3d-force-graph.min.js"></script>
  ```
  Replace it with:
  ```html
  <!-- Three.js via importmap — no build step required -->
  <script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.163.0/build/three.module.min.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.163.0/examples/jsm/"
    }
  }
  </script>
  ```

- [ ] **Step 2: Remove the `#pause-physics` button from the controls block**

  Find and delete:
  ```html
  <button id="pause-physics" class="w-9 h-9 bg-surface border border-border text-dim rounded-[6px] cursor-pointer text-[14px] shadow-panel transition-colors duration-200 hover:text-bright hover:bg-surface2" title="Pause physics">⏸</button>
  ```

- [ ] **Step 3: Commit**
  ```bash
  git add index.html
  git commit -m "chore: swap 3d-force-graph CDN for Three.js importmap, remove pause-physics button"
  ```

---

## Task 2: sources.js — add lat/lng coordinates

**Files:**
- Modify: `src/sources.js`

- [ ] **Step 1: Add `lat` and `lng` to each source in the `SOURCES` array**

  Replace the current `SOURCES` array entries with the versions below. Only the source object literals change; all adapter functions stay untouched.

  ```javascript
  export const SOURCES = [
      {
          id: "loc",
          label: "Library of Congress",
          shortLabel: "LoC",
          country: "US",
          region: "Americas",
          color: "#1abc9c",
          lat: 38.9,
          lng: -77.0,
          searchFn: locSearchFn,
          enabled: true,
      },
      {
          id: "trove",
          label: "Trove (NLA)",
          shortLabel: "Trove",
          country: "AU",
          region: "Oceania",
          color: "#2ecc71",
          lat: -35.3,
          lng: 149.1,
          searchFn: troveSearchFn,
          enabled: true,
      },
      {
          id: "europeana",
          label: "Europeana",
          shortLabel: "Euro",
          country: "EU",
          region: "Europe",
          color: "#3498db",
          lat: 52.1,
          lng: 4.3,
          searchFn: europeanaSearchFn,
          enabled: true,
      },
      {
          id: "dpla",
          label: "Digital Public Library of America",
          shortLabel: "DPLA",
          country: "US",
          region: "Americas",
          color: "#e74c3c",
          lat: 42.4,
          lng: -71.1,
          searchFn: dplaSearchFn,
          enabled: true,
          requiresKey: false,
      },
      {
          id: "slv",
          label: "State Library of Victoria",
          shortLabel: "SLV",
          country: "AU",
          region: "Oceania",
          color: "#f39c12",
          lat: -37.8,
          lng: 144.9,
          searchFn: slvSearchFn,
          enabled: true,
          requiresKey: false,
      },
  ];
  ```

  Note: SLV color changed from duplicate `#e74c3c` to `#f39c12` to avoid collision with DPLA.

- [ ] **Step 2: Commit**
  ```bash
  git add src/sources.js
  git commit -m "feat: add lat/lng coordinates to SOURCES for world map anchors"
  ```

---

## Task 3: Download world map asset

**Files:**
- Create: `assets/world-map.jpg`

- [ ] **Step 1: Create the assets directory and download the texture**
  ```bash
  mkdir -p assets
  curl -L "https://cdn.jsdelivr.net/npm/three@0.163.0/examples/textures/land_ocean_ice_cloud_2048.jpg" \
    -o assets/world-map.jpg
  ```
  Expected: file ~1.5MB at `assets/world-map.jpg`.

- [ ] **Step 2: Commit**
  ```bash
  git add assets/world-map.jpg
  git commit -m "chore: add equirectangular world map texture (NASA Blue Marble, public domain)"
  ```

---

## Task 4: Create mapview.js

**Files:**
- Create: `src/mapview.js`

This is the core new module. It owns the Three.js scene, both renderers, all anchor objects, and all card objects.

- [ ] **Step 1: Write `src/mapview.js`**

  Create `src/mapview.js` with the following complete content:

  ```javascript
  import * as THREE from 'three'
  import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js'
  import { MapControls } from 'three/addons/controls/MapControls.js'
  import { state } from './state.js'
  import { emit, on } from './bus.js'
  import { SOURCES } from './sources.js'

  // ─── Constants (tune here, not throughout the code) ──────────────────────────
  const CAMERA_DEFAULT_POS = new THREE.Vector3(0, 120, 80)
  const CAMERA_DEFAULT_TARGET = new THREE.Vector3(0, 0, 0)
  const FAN_RADIUS = 18          // scene units (degrees) from anchor to card centre
  const FAN_ARC_DEG = 120        // degrees of arc for the fan
  const CARDS_PER_PAGE = 10
  const CARD_SCALE = 0.045       // CSS pixels → scene units
  const CARD_WIDTH_PX = 180
  const CARD_HEIGHT_PX = 130
  const ANCHOR_HEIGHT = 3        // cylinder height in scene units
  const MAP_TEXTURE = 'assets/world-map.jpg'

  // ─── Module-level state ───────────────────────────────────────────────────────
  let scene, webglRenderer, css3dRenderer, camera, controls, container
  let animationId = null

  /**
   * fanState: Map<sourceId, {
   *   open: boolean,
   *   page: number,
   *   nodes: Node[],
   *   anchorMesh: THREE.Mesh,
   *   labelObj: CSS3DObject | null,
   *   cards: CSS3DObject[],
   * }>
   */
  const fanState = new Map()

  // ─── Coordinate helpers ───────────────────────────────────────────────────────
  function geoToScene(lat, lng) {
    return new THREE.Vector3(lng, 0, -lat)
  }

  // ─── Init ─────────────────────────────────────────────────────────────────────
  export function initMap(el) {
    container = el

    scene = new THREE.Scene()

    // Camera
    camera = new THREE.PerspectiveCamera(50, el.clientWidth / el.clientHeight, 0.1, 2000)
    camera.position.copy(CAMERA_DEFAULT_POS)
    camera.lookAt(CAMERA_DEFAULT_TARGET)

    // WebGL renderer — map plane only, no pointer events
    webglRenderer = new THREE.WebGLRenderer({ antialias: true })
    webglRenderer.setPixelRatio(window.devicePixelRatio)
    webglRenderer.setSize(el.clientWidth, el.clientHeight)
    webglRenderer.setClearColor(0x080c10)
    webglRenderer.domElement.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;'
    el.appendChild(webglRenderer.domElement)

    // CSS3D renderer — cards, labels, receives pointer events
    css3dRenderer = new CSS3DRenderer()
    css3dRenderer.setSize(el.clientWidth, el.clientHeight)
    css3dRenderer.domElement.style.cssText = 'position:absolute;top:0;left:0;'
    el.appendChild(css3dRenderer.domElement)

    // Map controls (pan + zoom, no rotation)
    controls = new MapControls(camera, css3dRenderer.domElement)
    controls.enableRotate = false
    controls.minDistance = 25
    controls.maxDistance = 280
    controls.update()

    // Map plane: 360° wide × 180° tall, lying flat in XZ plane
    const mapGeo = new THREE.PlaneGeometry(360, 180)
    mapGeo.rotateX(-Math.PI / 2)
    const mapMat = new THREE.MeshBasicMaterial({ color: 0x080c10 })
    scene.add(new THREE.Mesh(mapGeo, mapMat))

    new THREE.TextureLoader().load(MAP_TEXTURE, (tex) => {
      mapMat.map = tex
      mapMat.needsUpdate = true
    })

    // Latitude/longitude grid lines (subtle)
    _addGrid()

    // Source anchors
    for (const source of SOURCES) {
      if (source.lat == null || source.lng == null) continue
      const pos = geoToScene(source.lat, source.lng)

      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 0.8, ANCHOR_HEIGHT, 8),
        new THREE.MeshBasicMaterial({ color: source.color })
      )
      mesh.position.set(pos.x, ANCHOR_HEIGHT / 2, pos.z)
      mesh.userData.sourceId = source.id
      scene.add(mesh)

      fanState.set(source.id, {
        open: false,
        page: 0,
        nodes: [],
        anchorMesh: mesh,
        labelObj: null,
        cards: [],
      })
    }

    // Click handling — raycast against anchor meshes from CSS3D canvas
    css3dRenderer.domElement.addEventListener('click', _onCanvasClick)

    // Bus: re-sync cards whenever state.nodes changes
    on('graph:update', _onGraphUpdate)

    // Resize
    window.addEventListener('resize', _onResize)

    // Animate
    function animate() {
      animationId = requestAnimationFrame(animate)
      controls.update()
      // Keep labels facing camera
      for (const data of fanState.values()) {
        if (data.labelObj) data.labelObj.quaternion.copy(camera.quaternion)
      }
      webglRenderer.render(scene, camera)
      css3dRenderer.render(scene, camera)
    }
    animate()
  }

  // ─── Clear / reset ────────────────────────────────────────────────────────────
  export function clearMap() {
    for (const [sourceId, data] of fanState) {
      _removeCards(sourceId)
      data.nodes = []
      data.open = false
      data.page = 0
    }
  }

  // ─── Zoom to fit ──────────────────────────────────────────────────────────────
  export function zoomToFit() {
    camera.position.copy(CAMERA_DEFAULT_POS)
    controls.target.copy(CAMERA_DEFAULT_TARGET)
    controls.update()
  }

  // ─── Internal: graph update handler ──────────────────────────────────────────
  function _onGraphUpdate() {
    // Group result nodes by sourceId
    const bySource = new Map()
    for (const node of state.nodes.values()) {
      if (!node.sourceId || node.type === 'query' || node.type === 'source') continue
      if (!bySource.has(node.sourceId)) bySource.set(node.sourceId, [])
      bySource.get(node.sourceId).push(node)
    }

    for (const [sourceId, nodes] of bySource) {
      if (!fanState.has(sourceId)) continue
      const data = fanState.get(sourceId)
      data.nodes = nodes
      data.page = 0
      if (data.open) _renderCards(sourceId)
      _updateLabel(sourceId)
    }
  }

  // ─── Internal: canvas click → raycast ────────────────────────────────────────
  function _onCanvasClick(e) {
    const rect = css3dRenderer.domElement.getBoundingClientRect()
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    )

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(mouse, camera)

    const meshes = [...fanState.values()].map(d => d.anchorMesh)
    const hits = raycaster.intersectObjects(meshes)

    if (hits.length > 0) {
      const sourceId = hits[0].object.userData.sourceId
      _toggleFan(sourceId)
    } else {
      emit('background:click')
    }
  }

  // ─── Internal: toggle fan open/closed ────────────────────────────────────────
  function _toggleFan(sourceId) {
    const data = fanState.get(sourceId)
    if (!data) return

    if (data.open) {
      _removeCards(sourceId)
      data.open = false
    } else {
      data.open = true
      _renderCards(sourceId)
    }
    _updateLabel(sourceId)
  }

  // ─── Internal: render current page of cards for a source ─────────────────────
  function _renderCards(sourceId) {
    _removeCards(sourceId)
    const data = fanState.get(sourceId)
    const source = SOURCES.find(s => s.id === sourceId)
    if (!source || !data.nodes.length) return

    const start = data.page * CARDS_PER_PAGE
    const pageNodes = data.nodes.slice(start, start + CARDS_PER_PAGE)

    const anchorPos = data.anchorMesh.position.clone()
    anchorPos.y = 0  // project to map plane for fan geometry

    const positions = _fanPositions(anchorPos, pageNodes.length)

    for (let i = 0; i < pageNodes.length; i++) {
      const node = pageNodes[i]
      const { x, z, yRot } = positions[i]

      const el = _createCardEl(node, source)
      el.addEventListener('click', (ev) => {
        ev.stopPropagation()
        emit('node:click', node)
      })
      el.addEventListener('mouseenter', (ev) => {
        ev.stopPropagation()
        emit('node:hover', node)
      })
      el.addEventListener('mouseleave', (ev) => {
        ev.stopPropagation()
        emit('node:hover', null)
      })

      const obj = new CSS3DObject(el)
      obj.position.set(x, (CARD_HEIGHT_PX * CARD_SCALE) / 2, z)
      obj.rotation.y = yRot
      obj.scale.setScalar(CARD_SCALE)
      scene.add(obj)
      data.cards.push(obj)
    }
  }

  // ─── Internal: remove all card objects for a source ──────────────────────────
  function _removeCards(sourceId) {
    const data = fanState.get(sourceId)
    for (const obj of data.cards) {
      scene.remove(obj)
      obj.element.remove()
    }
    data.cards = []
  }

  // ─── Internal: update/create the anchor label (counter + prev/next) ───────────
  function _updateLabel(sourceId) {
    const data = fanState.get(sourceId)
    const source = SOURCES.find(s => s.id === sourceId)
    if (!source) return

    if (data.labelObj) {
      scene.remove(data.labelObj)
      data.labelObj.element.remove()
      data.labelObj = null
    }

    const total = data.nodes.length
    const el = document.createElement('div')
    el.style.cssText = `
      background: rgba(8,12,16,0.85);
      border: 1px solid ${source.color};
      border-radius: 6px;
      padding: 4px 8px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #c8d8e8;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: default;
      user-select: none;
    `

    const label = document.createElement('span')
    label.style.color = source.color
    label.style.fontWeight = 'bold'
    label.textContent = source.shortLabel
    el.appendChild(label)

    if (total > 0) {
      const currentPage = data.page + 1
      const totalPages = Math.ceil(total / CARDS_PER_PAGE)

      const counter = document.createElement('span')
      counter.textContent = `${currentPage}/${totalPages} (${total})`
      el.appendChild(counter)

      if (data.open && totalPages > 1) {
        const prev = document.createElement('button')
        prev.textContent = '◀'
        prev.style.cssText = 'background:none;border:none;color:#c8d8e8;cursor:pointer;padding:0 2px;'
        prev.disabled = data.page === 0
        prev.style.opacity = data.page === 0 ? '0.3' : '1'
        prev.addEventListener('click', (ev) => {
          ev.stopPropagation()
          if (data.page > 0) { data.page--; _renderCards(sourceId); _updateLabel(sourceId) }
        })

        const next = document.createElement('button')
        next.textContent = '▶'
        next.style.cssText = 'background:none;border:none;color:#c8d8e8;cursor:pointer;padding:0 2px;'
        next.disabled = data.page >= totalPages - 1
        next.style.opacity = data.page >= totalPages - 1 ? '0.3' : '1'
        next.addEventListener('click', (ev) => {
          ev.stopPropagation()
          if (data.page < totalPages - 1) { data.page++; _renderCards(sourceId); _updateLabel(sourceId) }
        })

        el.appendChild(prev)
        el.appendChild(next)
      }
    }

    // Clicking the label toggles fan (same as clicking the cylinder)
    el.addEventListener('click', (ev) => {
      ev.stopPropagation()
      _toggleFan(sourceId)
    })

    const obj = new CSS3DObject(el)
    const anchorPos = data.anchorMesh.position
    obj.position.set(anchorPos.x, ANCHOR_HEIGHT + 2, anchorPos.z)
    obj.scale.setScalar(CARD_SCALE * 1.4)
    scene.add(obj)
    data.labelObj = obj
  }

  // ─── Internal: compute card positions for a fan ───────────────────────────────
  function _fanPositions(anchorPos, count) {
    // Fan faces toward default camera footprint
    const cameraFootprint = new THREE.Vector3(CAMERA_DEFAULT_POS.x, 0, CAMERA_DEFAULT_POS.z)
    const toCamera = new THREE.Vector3().subVectors(cameraFootprint, anchorPos)
    if (toCamera.lengthSq() < 0.001) toCamera.set(0, 0, 1)
    toCamera.normalize()

    const baseAngle = Math.atan2(toCamera.x, toCamera.z)
    const halfArc = (FAN_ARC_DEG * Math.PI) / 180 / 2
    const positions = []

    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1)
      const angle = baseAngle - halfArc + t * (2 * halfArc)
      positions.push({
        x: anchorPos.x + FAN_RADIUS * Math.sin(angle),
        z: anchorPos.z + FAN_RADIUS * Math.cos(angle),
        yRot: -angle,
      })
    }
    return positions
  }

  // ─── Internal: build a card DOM element ──────────────────────────────────────
  function _createCardEl(node, source) {
    const el = document.createElement('div')
    el.style.cssText = `
      width: ${CARD_WIDTH_PX}px;
      height: ${CARD_HEIGHT_PX}px;
      background: rgba(15,21,32,0.95);
      border: 1px solid ${source.color}55;
      border-top: 2px solid ${source.color};
      border-radius: 6px;
      padding: 8px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 4px;
      cursor: pointer;
      font-family: 'Inter', sans-serif;
      overflow: hidden;
      backface-visibility: hidden;
    `
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:5px;flex-shrink:0;">
        <span style="width:8px;height:8px;border-radius:50%;background:${source.color};flex-shrink:0;"></span>
        <span style="font-size:9px;color:${source.color};font-weight:600;text-transform:uppercase;letter-spacing:0.5px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">${source.shortLabel}</span>
      </div>
      ${node.thumbnailUrl ? `<img src="${node.thumbnailUrl}" style="width:100%;height:44px;object-fit:cover;border-radius:3px;flex-shrink:0;" onerror="this.style.display='none'">` : ''}
      <div style="font-size:11px;color:#e8f0f8;line-height:1.3;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;flex:1;">${_esc(node.title || 'Untitled')}</div>
      ${node.date ? `<div style="font-size:9px;color:#5a7090;flex-shrink:0;">${_esc(node.date)}</div>` : ''}
    `
    return el
  }

  // ─── Internal: subtle grid overlay ───────────────────────────────────────────
  function _addGrid() {
    const mat = new THREE.LineBasicMaterial({ color: 0x1e2d42, transparent: true, opacity: 0.4 })

    // Longitude lines every 30°
    for (let lng = -180; lng <= 180; lng += 30) {
      const pts = [new THREE.Vector3(lng, 0.01, -90), new THREE.Vector3(lng, 0.01, 90)]
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat))
    }

    // Latitude lines every 30°
    for (let lat = -90; lat <= 90; lat += 30) {
      const pts = [new THREE.Vector3(-180, 0.01, -lat), new THREE.Vector3(180, 0.01, -lat)]
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat))
    }
  }

  // ─── Internal: HTML escape ────────────────────────────────────────────────────
  function _esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  // ─── Internal: resize handler ─────────────────────────────────────────────────
  function _onResize() {
    if (!container) return
    camera.aspect = container.clientWidth / container.clientHeight
    camera.updateProjectionMatrix()
    webglRenderer.setSize(container.clientWidth, container.clientHeight)
    css3dRenderer.setSize(container.clientWidth, container.clientHeight)
  }
  ```

- [ ] **Step 2: Verify the file exists**
  ```bash
  wc -l src/mapview.js
  ```
  Expected: 250+ lines.

- [ ] **Step 3: Commit**
  ```bash
  git add src/mapview.js
  git commit -m "feat: add mapview.js — Three.js world map with CSS3D card fans"
  ```

---

## Task 5: Update state.js — remove graph-specific fields

**Files:**
- Modify: `src/state.js`

- [ ] **Step 1: Remove `edges`, `physicsPaused`, `linkModeActive`, `linkModeSourceNode` from `state`**

  Replace the `state` export with:
  ```javascript
  export const state = {
    nodes: new Map(),        // id -> node object
    collection: new Map(),   // nodeId -> { annotation, pinnedAt, result, label, sourceId }
    queryHistory: [],
    importedMode: false,
    nodeLimit: 500,
    labelsVisible: true,
    filters: {
      hiddenSources: new Set(),
      hiddenTypes: new Set(),
    },
    sourceStatuses: new Map(), // sourceId -> { status, count, latency, proxyUsed }
  }
  ```

- [ ] **Step 2: Update `resetGraph` to not reference `edges` or link mode fields**

  Replace the `resetGraph` function with:
  ```javascript
  export function resetGraph() {
    state.nodes.clear()
    state.queryHistory = []
    state.importedMode = false
    state.sourceStatuses.clear()
  }
  ```

- [ ] **Step 3: Commit**
  ```bash
  git add src/state.js
  git commit -m "refactor: remove edges and physics/link-mode state fields"
  ```

---

## Task 6: Update search.js — remove all edge and graph-primitive logic

**Files:**
- Modify: `src/search.js`

- [ ] **Step 1: Replace `src/search.js` entirely with the following**

  ```javascript
  import { state, resetGraph } from './state.js'
  import { emit } from './bus.js'
  import { clearMap } from './mapview.js'
  import { enabledSources } from './sources.js'

  export async function runSearch(query) {
    query = query.trim()
    if (!query) return

    resetGraph()
    clearMap()

    state.queryHistory.push(query)
    emit('search:start', { query })

    const sources = enabledSources()
    await Promise.allSettled(sources.map(source => _runSourceQuery(query, source)))

    emit('search:done', { query })
  }

  export async function expandNode(node) {
    if (state.importedMode) return
    if (state.nodes.size >= state.nodeLimit) {
      emit('node-cap:reached')
      return
    }
    if (state.queryHistory.length >= 3) {
      emit('depth-limit:reached', { node })
      return
    }

    const expandQuery = node.result?.title || node.label
    node.expanded = true

    state.queryHistory.push(expandQuery)
    emit('search:start', { query: expandQuery, expansion: true })

    const sources = enabledSources()
    await Promise.allSettled(sources.map(source => _runSourceQuery(expandQuery, source)))

    emit('search:done', { query: expandQuery, expansion: true })
  }

  async function _runSourceQuery(query, source) {
    const t0 = Date.now()
    state.sourceStatuses.set(source.id, { status: 'querying', count: 0, latency: null, proxyUsed: false })
    emit('source:status', { sourceId: source.id, status: 'querying' })

    try {
      const results = await source.searchFn({ query })
      const latency = Date.now() - t0

      for (const result of results) {
        if (state.nodes.size >= state.nodeLimit) {
          emit('node-cap:reached')
          break
        }
        if (state.nodes.has(result.id)) continue

        state.nodes.set(result.id, {
          ...result,
          label: result.title,
          color: source.color,
          pinned: state.collection.has(result.id),
          expanded: false,
          annotation: state.collection.get(result.id)?.annotation || '',
        })
      }

      emit('graph:update')

      state.sourceStatuses.set(source.id, { status: 'done', count: results.length, latency, proxyUsed: false })
      emit('source:status', { sourceId: source.id, status: 'done', count: results.length, latency })
    } catch (err) {
      const latency = Date.now() - t0
      console.warn(`[${source.id}] error:`, err.message)
      state.sourceStatuses.set(source.id, { status: 'error', count: 0, latency, error: err.message })
      emit('source:status', { sourceId: source.id, status: 'error', error: err.message })
    }
  }
  ```

- [ ] **Step 2: Commit**
  ```bash
  git add src/search.js
  git commit -m "refactor: remove edge-building from search.js; emit graph:update instead of addToGraph"
  ```

---

## Task 7: Update ui.js — remove dead imports and link-mode code

**Files:**
- Modify: `src/ui.js`

- [ ] **Step 1: Update the import block at the top of ui.js**

  Replace the current import lines:
  ```javascript
  import { runSearch, expandNode, getNodeDepth, addUserLink } from "./search.js";
  import { zoomToFit, togglePhysics, refreshGraph } from "./graph.js";
  ```
  With:
  ```javascript
  import { runSearch, expandNode } from "./search.js";
  import { zoomToFit } from "./mapview.js";
  ```

- [ ] **Step 2: Remove the pause-physics event handler**

  Find and delete this block:
  ```javascript
  $("pause-physics").addEventListener("click", () => {
      const paused = togglePhysics();
      $("pause-physics").textContent = paused ? "▶" : "⏸";
      $("pause-physics").title = paused ? "Resume physics" : "Pause physics";
  });
  ```

- [ ] **Step 3: Replace all `refreshGraph()` calls with nothing**

  There are multiple `refreshGraph()` calls in ui.js. Delete each one — the Three.js animation loop renders continuously, so explicit refresh calls are not needed.

  Lines to remove (delete the entire `refreshGraph()` statement at each location):
  - After the labels toggle handler
  - After filter chip toggles
  - After annotation save
  - After import:done handler

- [ ] **Step 4: Remove all link-mode references**

  Find and remove all blocks that reference `state.linkModeActive`, `state.linkModeSourceNode`, `addUserLink`, or render a "Link to another node" button. These are:

  a. In the detail panel renderer — find the link button conditional and remove it:
  ```javascript
  ${!state.importedMode ? '<button id="link-btn" ...>Link to another node</button>' : ""}
  ```
  And the associated event wiring:
  ```javascript
  state.linkModeActive = true;
  state.linkModeSourceNode = node;
  ```

  b. In the `node:click` handler — remove the link-mode branch:
  ```javascript
  if (state.linkModeActive && state.linkModeSourceNode) {
      if (node.id !== state.linkModeSourceNode.id) {
          addUserLink(state.linkModeSourceNode, node);
          state.linkModeActive = false;
          state.linkModeSourceNode = null;
  ```

  c. In the `background:click` handler — remove the link-mode cancel block:
  ```javascript
  if (state.linkModeActive) {
      state.linkModeActive = false;
      state.linkModeSourceNode = null;
      emit("link-mode:cancel");
  }
  ```

  d. Remove the `getNodeDepth` usage if any remain.

- [ ] **Step 5: Verify ui.js has no remaining references to removed identifiers**
  ```bash
  grep -n "linkMode\|togglePhysics\|refreshGraph\|addUserLink\|getNodeDepth\|pause-physics" src/ui.js
  ```
  Expected: no output.

- [ ] **Step 6: Commit**
  ```bash
  git add src/ui.js
  git commit -m "refactor: remove link-mode, pause-physics, and refreshGraph from ui.js"
  ```

---

## Task 8: Update main.js — wire mapview

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Replace `src/main.js` entirely with the following**

  ```javascript
  import { state, loadCollectionFromStorage, resetGraph } from './state.js'
  import { initMap, clearMap, zoomToFit } from './mapview.js'
  import { initUI, renderCollectionDrawer, renderSourcePanel } from './ui.js'

  const container = document.getElementById('graph-container')
  initMap(container)

  // Expose for reset button in ui.js (avoids circular import)
  window.__appModules = { resetGraph, clearMap }

  loadCollectionFromStorage()

  initUI()
  renderSourcePanel()
  renderCollectionDrawer()
  ```

- [ ] **Step 2: Verify ui.js reset-graph handler uses the right key**

  In ui.js, the reset button calls `window.__appModules`. Search for its usage:
  ```bash
  grep -n "__appModules" src/ui.js
  ```
  The reset button should call both `resetGraph` and `clearMap`. If it calls `clearGraph`, update those references to `clearMap`.

- [ ] **Step 3: Commit**
  ```bash
  git add src/main.js
  git commit -m "feat: wire mapview into main.js, replacing graph module"
  ```

---

## Task 9: Update collection.js — remove graph.js dependency and edge logic

**Files:**
- Modify: `src/collection.js`

`collection.js` currently imports `addToGraph, clearGraph, makeSourceAnchor` from `./graph.js` and reads/writes `state.edges`. Both must be removed.

- [ ] **Step 1: Replace `src/collection.js` entirely with the following**

  ```javascript
  import { state, saveCollectionToStorage, resetGraph } from './state.js'
  import { emit } from './bus.js'
  import { clearMap } from './mapview.js'
  import { SOURCES, getSource } from './sources.js'

  export function pinNode(node) {
    if (state.collection.has(node.id)) return
    state.collection.set(node.id, {
      annotation: node.annotation || '',
      pinnedAt: new Date().toISOString(),
      result: node.result || null,
      label: node.label,
      sourceId: node.sourceId,
      color: node.color,
    })
    node.pinned = true
    saveCollectionToStorage()
    emit('collection:changed')
  }

  export function unpinNode(nodeId) {
    if (!state.collection.has(nodeId)) return
    state.collection.delete(nodeId)
    const node = state.nodes.get(nodeId)
    if (node) node.pinned = false
    saveCollectionToStorage()
    emit('collection:changed')
  }

  export function setAnnotation(nodeId, text) {
    const entry = state.collection.get(nodeId)
    if (!entry) return
    entry.annotation = text
    const node = state.nodes.get(nodeId)
    if (node) node.annotation = text
    saveCollectionToStorage()
    emit('collection:changed')
  }

  export function exportCollection() {
    const nodes = []
    const sourceIds = new Set()

    for (const [nodeId, entry] of state.collection) {
      sourceIds.add(entry.sourceId)
      nodes.push({
        id: nodeId,
        label: entry.label,
        type: entry.result?.type || 'work',
        sourceId: entry.sourceId,
        annotation: entry.annotation,
        result: entry.result,
      })
    }

    const sources = SOURCES
      .filter(s => sourceIds.has(s.id))
      .map(s => ({ id: s.id, label: s.label, color: s.color }))

    const payload = {
      version: '2.0',
      meta: {
        created: new Date().toISOString(),
        query_history: [...state.queryHistory],
        description: '',
      },
      sources,
      nodes,
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `library-collection-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  export function importGraph(data) {
    if (!data.nodes) {
      alert('Not a valid library collection file.')
      return
    }

    resetGraph()
    clearMap()
    state.importedMode = true
    state.queryHistory = data.meta?.query_history || []

    const sourceColors = {}
    for (const s of (data.sources || [])) sourceColors[s.id] = s.color

    for (const n of data.nodes) {
      const color = sourceColors[n.sourceId] || getSource(n.sourceId)?.color || '#888888'
      state.nodes.set(n.id, {
        id: n.id,
        label: n.label,
        type: n.type || 'work',
        sourceId: n.sourceId,
        color,
        result: n.result || null,
        pinned: state.collection.has(n.id),
        expanded: false,
        annotation: n.annotation || '',
      })
    }

    emit('graph:update')
    emit('import:done', data)
  }
  ```

- [ ] **Step 2: Commit**
  ```bash
  git add src/collection.js
  git commit -m "refactor: remove graph.js dependency and edge logic from collection.js"
  ```

---

## Task 10: Delete graph.js

**Files:**
- Delete: `src/graph.js`

- [ ] **Step 1: Confirm nothing imports graph.js anymore**
  ```bash
  grep -r "from.*graph\.js\|require.*graph" src/ index.html
  ```
  Expected: no output. If any remain, fix those imports first.

- [ ] **Step 2: Delete the file**
  ```bash
  git rm src/graph.js
  git commit -m "chore: delete graph.js (replaced by mapview.js)"
  ```

---

## Task 11: Manual verification

- [ ] **Step 1: Start the dev server**
  ```bash
  python3 -m http.server 8080
  ```
  Open `http://localhost:8080` in a browser.

- [ ] **Step 2: Verify initial state**
  - The world map renders with the earth texture (or dark ocean fallback while it loads)
  - Grid lines are visible
  - 5 coloured anchor cylinders appear at correct geographic locations (US east coast, Canberra, The Hague, Melbourne, Boston)
  - Each anchor has a label showing the source short name
  - No JS console errors

- [ ] **Step 3: Verify search flow**
  - Type "history" in the search bar and press Search
  - Source status chips appear in the status bar showing querying → done
  - Anchor labels update to show result counts (e.g., `Trove 1/4 (35)`)
  - No console errors

- [ ] **Step 4: Verify card fan**
  - Click a source anchor → a fan of up to 10 cards spreads out in an arc above the map
  - Cards show: coloured source badge, title, thumbnail (if available), date (if available)
  - Click anywhere else on the map → fan closes; `background:click` closes detail panel
  - Click another anchor → its fan opens
  - If > 10 results: prev/next buttons appear in the label; clicking them pages through cards

- [ ] **Step 5: Verify card detail interaction**
  - Click a card → detail panel slides in on the right with node details
  - Pin/unpin, annotation save still work
  - Collection drawer still works

- [ ] **Step 6: Verify map navigation**
  - Drag to pan across the map
  - Scroll to zoom in/out
  - Zoom-to-fit button (⊡) resets to world overview

- [ ] **Step 7: Final commit**
  ```bash
  git add -A
  git commit -m "docs: update plan with verification notes" --allow-empty
  ```
