/**
 * mapview.js — Three.js world map scene
 *
 * Two renderers share #graph-container:
 *   WebGLRenderer   — map plane (bottom layer, pointer-events: none)
 *   CSS3DRenderer   — HTML cards (top layer, transparent background)
 */

import * as THREE from 'three'
import { MapControls } from 'three/addons/controls/MapControls.js'
import { CSS3DObject, CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js'

import { SOURCES } from './sources.js'
import { state } from './state.js'
import { on, emit } from './bus.js'

// ─── Constants ────────────────────────────────────────────────────────────────

const CAMERA_INIT = { x: 0, y: 120, z: 80 } // initial camera position (spec: (0,120,80) looking at origin)
const CARDS_PER_PAGE = 10
const FAN_RADIUS = 20
const FAN_ARC_DEG = 120
const CARD_HEIGHT = 15  // CSS3DObject center y (cards stand from y≈0 to y≈30)

// ─── Module-level state ───────────────────────────────────────────────────────

let scene, webglRenderer, css3dRenderer, camera, controls, container
let animFrameId = null

// anchor mesh per sourceId
const anchorMeshes = new Map()   // sourceId -> THREE.Mesh

// per-source card state
const sourceCardState = new Map() // sourceId -> { cards: CSS3DObject[], page: number, open: boolean, paginationObj: CSS3DObject|null }

// anchor open/closed state
const anchorOpen = new Map()     // sourceId -> boolean

// bus handler ref so we can clean up
let graphUpdateHandler = null

// ─── Coordinate helpers ───────────────────────────────────────────────────────

function lngLatToXZ(lng, lat) {
  return { x: lng, z: -lat }
}

// ─── Renderer / scene setup ───────────────────────────────────────────────────

export function initMap(cont) {
  container = cont

  const w = container.clientWidth
  const h = container.clientHeight

  // ── Scene ──────────────────────────────────────────────────────────────────
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x080c10)

  // ── Camera ─────────────────────────────────────────────────────────────────
  camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 2000)
  camera.position.set(CAMERA_INIT.x, CAMERA_INIT.y, CAMERA_INIT.z)
  camera.lookAt(0, 0, 0)

  // ── WebGL Renderer ─────────────────────────────────────────────────────────
  webglRenderer = new THREE.WebGLRenderer({ antialias: true })
  webglRenderer.setPixelRatio(window.devicePixelRatio)
  webglRenderer.setSize(w, h)
  webglRenderer.domElement.style.position = 'absolute'
  webglRenderer.domElement.style.top = '0'
  webglRenderer.domElement.style.left = '0'
  webglRenderer.domElement.style.pointerEvents = 'none'
  container.appendChild(webglRenderer.domElement)

  // ── CSS3D Renderer ─────────────────────────────────────────────────────────
  css3dRenderer = new CSS3DRenderer()
  css3dRenderer.setSize(w, h)
  css3dRenderer.domElement.style.position = 'absolute'
  css3dRenderer.domElement.style.top = '0'
  css3dRenderer.domElement.style.left = '0'
  // transparent so WebGL layer shows through
  css3dRenderer.domElement.style.background = 'transparent'
  container.appendChild(css3dRenderer.domElement)

  // ── Map Controls ───────────────────────────────────────────────────────────
  controls = new MapControls(camera, css3dRenderer.domElement)
  controls.enableRotate = false
  controls.enablePan = true
  controls.enableZoom = true
  controls.minDistance = 20   // camera y effectively via dolly
  controls.maxDistance = 400
  controls.screenSpacePanning = false
  controls.maxPolarAngle = Math.PI / 2

  // ── World Map Plane ─────────────────────────────────────────────────────────
  const planeGeo = new THREE.PlaneGeometry(360, 180)
  const planeMat = new THREE.MeshBasicMaterial({ color: 0x080c10 })
  const plane = new THREE.Mesh(planeGeo, planeMat)
  plane.rotation.x = -Math.PI / 2
  plane.position.y = 0
  scene.add(plane)

  // Load map texture asynchronously — swap in when ready
  const loader = new THREE.TextureLoader()
  loader.load(
    'assets/world-map.png',
    (texture) => {
      planeMat.map = texture
      planeMat.needsUpdate = true
    },
    undefined,
    () => { /* silently use fallback color on error */ }
  )

  // ── Source Anchors ─────────────────────────────────────────────────────────
  _createSourceAnchors()

  // ── Raycaster for anchor clicks ────────────────────────────────────────────
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()

  css3dRenderer.domElement.addEventListener('click', (e) => {
    const rect = css3dRenderer.domElement.getBoundingClientRect()
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    raycaster.setFromCamera(pointer, camera)
    const meshes = [...anchorMeshes.values()]
    const hits = raycaster.intersectObjects(meshes, false)
    if (hits.length > 0) {
      const mesh = hits[0].object
      const sourceId = mesh.userData.sourceId
      _toggleFan(sourceId)
    } else {
      // background click (no CSS3D card intercepted it)
      emit('background:click', null)
    }
  })

  // ── Bus integration ─────────────────────────────────────────────────────────
  graphUpdateHandler = () => syncAllSourceCards()
  on('graph:update', graphUpdateHandler)

  // ── Resize ─────────────────────────────────────────────────────────────────
  window.addEventListener('resize', _onResize)

  // ── Render Loop ────────────────────────────────────────────────────────────
  _startRenderLoop()
}

// ─── Anchor creation ──────────────────────────────────────────────────────────

function _createSourceAnchors() {
  for (const source of SOURCES) {
    if (source.lat == null || source.lng == null) continue

    const { x, z } = lngLatToXZ(source.lng, source.lat)

    const geo = new THREE.CylinderGeometry(1, 1, 2, 8)
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(source.color) })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(x, 1, z)
    mesh.userData = { sourceId: source.id, page: 0, totalPages: 0 }
    scene.add(mesh)
    anchorMeshes.set(source.id, mesh)

    // Add a label via CSS3DObject above each anchor
    const labelDiv = document.createElement('div')
    labelDiv.textContent = source.shortLabel || source.id
    labelDiv.style.cssText = `
      color: ${source.color};
      font-size: 10px;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      background: rgba(8,12,16,0.7);
      padding: 1px 4px;
      border-radius: 3px;
      pointer-events: none;
      white-space: nowrap;
    `
    const labelObj = new CSS3DObject(labelDiv)
    // scale down — CSS3DObjects are in pixel space
    labelObj.scale.setScalar(0.05)
    labelObj.position.set(x, 4, z)
    scene.add(labelObj)

    // Initial state: closed, no cards
    anchorOpen.set(source.id, false)
    sourceCardState.set(source.id, { cards: [], page: 0, open: false, paginationObj: null })
  }
}

// ─── Fan toggle ───────────────────────────────────────────────────────────────

function _toggleFan(sourceId) {
  const isOpen = anchorOpen.get(sourceId) ?? false
  if (isOpen) {
    _closeFan(sourceId)
  } else {
    _openFan(sourceId)
  }
}

function _openFan(sourceId) {
  anchorOpen.set(sourceId, true)
  const st = sourceCardState.get(sourceId)
  if (!st) return
  st.open = true
  _renderFanPage(sourceId, st.page)
}

function _closeFan(sourceId) {
  anchorOpen.set(sourceId, false)
  const st = sourceCardState.get(sourceId)
  if (!st) return
  st.open = false
  _removeFanCards(sourceId)
}

// ─── Card sync from state.nodes ───────────────────────────────────────────────

export function syncAllSourceCards() {
  // Group nodes by sourceId, filtering out query/source type nodes
  const bySource = new Map()
  for (const node of state.nodes.values()) {
    if (node.type === 'query' || node.type === 'source') continue
    const sid = node.sourceId
    if (!sid) continue
    if (!bySource.has(sid)) bySource.set(sid, [])
    bySource.get(sid).push(node)
  }

  for (const [sourceId, nodes] of bySource) {
    _syncSourceCards(sourceId, nodes)
  }

  // Also sync sources that now have zero results (clear their cards)
  for (const source of SOURCES) {
    if (!bySource.has(source.id)) {
      const st = sourceCardState.get(source.id)
      if (st && st.cards.length > 0) {
        _syncSourceCards(source.id, [])
      }
    }
  }
}

function _syncSourceCards(sourceId, nodes) {
  const st = sourceCardState.get(sourceId)
  if (!st) return

  // Rebuild node list, reset to page 0
  st.nodes = nodes
  st.page = 0
  const mesh = anchorMeshes.get(sourceId)
  if (mesh) {
    mesh.userData.totalPages = Math.ceil(nodes.length / CARDS_PER_PAGE)
  }

  // Remove existing displayed cards
  _removeFanCards(sourceId)

  // If the fan was open, re-render it
  if (st.open) {
    _renderFanPage(sourceId, 0)
  }
}

// ─── Fan rendering ────────────────────────────────────────────────────────────

function _removeFanCards(sourceId) {
  const st = sourceCardState.get(sourceId)
  if (!st) return
  for (const obj of st.cards) {
    scene.remove(obj)
    // Dispose DOM element
    if (obj.element && obj.element.parentNode) {
      obj.element.parentNode.removeChild(obj.element)
    }
  }
  st.cards = []
  if (st.paginationObj) {
    scene.remove(st.paginationObj)
    if (st.paginationObj.element && st.paginationObj.element.parentNode) {
      st.paginationObj.element.parentNode.removeChild(st.paginationObj.element)
    }
    st.paginationObj = null
  }
}

function _renderFanPage(sourceId, page) {
  const st = sourceCardState.get(sourceId)
  if (!st) return
  const nodes = st.nodes || []
  const totalPages = Math.ceil(nodes.length / CARDS_PER_PAGE)
  st.page = Math.max(0, Math.min(page, totalPages - 1))

  // Remove old cards first
  _removeFanCards(sourceId)

  const mesh = anchorMeshes.get(sourceId)
  if (!mesh) return
  const anchorX = mesh.position.x
  const anchorZ = mesh.position.z

  const source = SOURCES.find(s => s.id === sourceId)
  const sourceColor = source ? source.color : '#ffffff'

  // Slice nodes for this page
  const start = st.page * CARDS_PER_PAGE
  const pageNodes = nodes.slice(start, start + CARDS_PER_PAGE)
  const count = pageNodes.length
  if (count === 0) return

  // Fan arc: centered on direction from anchor toward (0, 0, 80) in XZ
  // Direction vector from anchor to default camera XZ projection
  const camXZ = { x: 0, z: 80 }
  const dirX = camXZ.x - anchorX
  const dirZ = camXZ.z - anchorZ
  const centerAngle = Math.atan2(dirX, dirZ) // atan2(x,z) gives angle in XZ

  const arcRad = (FAN_ARC_DEG * Math.PI) / 180
  const angleStep = count > 1 ? arcRad / (count - 1) : 0
  const startAngle = centerAngle - arcRad / 2

  const newCards = []
  for (let i = 0; i < count; i++) {
    const node = pageNodes[i]
    const angle = count > 1 ? startAngle + i * angleStep : centerAngle

    const px = anchorX + FAN_RADIUS * Math.sin(angle)
    const pz = anchorZ + FAN_RADIUS * Math.cos(angle)

    const cardObj = _createCard(node, sourceColor, sourceId, angle)
    cardObj.position.set(px, CARD_HEIGHT, pz)
    scene.add(cardObj)
    newCards.push(cardObj)
  }

  st.cards = newCards

  // Pagination overlay if multiple pages
  if (totalPages > 1) {
    const pagDiv = _createPaginationDiv(sourceId, st.page, totalPages, sourceColor)
    const pagObj = new CSS3DObject(pagDiv)
    pagObj.scale.setScalar(0.05)
    pagObj.position.set(anchorX, 2, anchorZ)
    scene.add(pagObj)
    st.paginationObj = pagObj
  }
}

// ─── Card DOM element ─────────────────────────────────────────────────────────

function _createCard(node, sourceColor, sourceId, faceAngle) {
  const div = document.createElement('div')
  div.style.cssText = `
    background: #0f1520;
    border: 1px solid #1e2d42;
    color: #c8d8e8;
    width: 200px;
    padding: 8px;
    border-radius: 6px;
    font-size: 12px;
    font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
    pointer-events: auto;
    cursor: pointer;
    box-sizing: border-box;
    user-select: none;
    overflow: hidden;
  `

  // Source badge row
  const badge = document.createElement('div')
  badge.style.cssText = `
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 4px;
  `
  const dot = document.createElement('span')
  dot.style.cssText = `
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${sourceColor};
    display: inline-block;
    flex-shrink: 0;
  `
  const srcLabel = document.createElement('span')
  srcLabel.style.cssText = 'color: #5a7090; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;'
  const source = SOURCES.find(s => s.id === sourceId)
  srcLabel.textContent = source ? (source.shortLabel || source.id) : sourceId
  badge.appendChild(dot)
  badge.appendChild(srcLabel)
  div.appendChild(badge)

  // Title
  const title = document.createElement('h3')
  title.style.cssText = `
    margin: 0 0 4px 0;
    font-size: 12px;
    font-weight: 600;
    color: #e8f0f8;
    line-height: 1.3;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  `
  title.textContent = node.title || 'Untitled'
  div.appendChild(title)

  // Date
  if (node.date) {
    const date = document.createElement('div')
    date.style.cssText = 'color: #5a7090; font-size: 10px; margin-bottom: 4px;'
    date.textContent = node.date
    div.appendChild(date)
  }

  // Thumbnail
  if (node.thumbnailUrl) {
    const img = document.createElement('img')
    img.src = node.thumbnailUrl
    img.style.cssText = `
      width: 100%;
      height: 80px;
      object-fit: cover;
      border-radius: 3px;
      display: block;
      margin-top: 4px;
    `
    img.onerror = () => { img.style.display = 'none' }
    div.appendChild(img)
  }

  // Events
  div.addEventListener('click', (e) => {
    e.stopPropagation()
    emit('node:click', node)
  })
  div.addEventListener('mouseenter', () => {
    emit('node:hover', node)
    div.style.borderColor = sourceColor
  })
  div.addEventListener('mouseleave', () => {
    emit('node:hover', null)
    div.style.borderColor = '#1e2d42'
  })

  const obj = new CSS3DObject(div)
  // Scale so 200px card appears ~10 world units wide
  // 200px * 0.05 = 10 world units
  obj.scale.setScalar(0.05)

  // Rotate to face outward along fan arc (away from anchor center)
  obj.rotation.y = -faceAngle

  return obj
}

// ─── Pagination DOM element ───────────────────────────────────────────────────

function _createPaginationDiv(sourceId, currentPage, totalPages, sourceColor) {
  const div = document.createElement('div')
  div.style.cssText = `
    background: #0f1520;
    border: 1px solid #1e2d42;
    color: #c8d8e8;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-family: 'Inter', system-ui, sans-serif;
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  `

  const prevBtn = document.createElement('button')
  prevBtn.textContent = '‹'
  prevBtn.style.cssText = `
    background: transparent;
    border: 1px solid #1e2d42;
    color: #c8d8e8;
    cursor: pointer;
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 13px;
    line-height: 1;
  `
  prevBtn.disabled = currentPage === 0
  if (currentPage === 0) prevBtn.style.opacity = '0.3'

  const counter = document.createElement('span')
  counter.style.color = '#5a7090'
  counter.textContent = `${currentPage + 1} / ${totalPages}`

  const nextBtn = document.createElement('button')
  nextBtn.textContent = '›'
  nextBtn.style.cssText = prevBtn.style.cssText
  nextBtn.disabled = currentPage >= totalPages - 1
  if (currentPage >= totalPages - 1) nextBtn.style.opacity = '0.3'

  prevBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    const st = sourceCardState.get(sourceId)
    if (st && st.page > 0) {
      _renderFanPage(sourceId, st.page - 1)
    }
  })

  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    const st = sourceCardState.get(sourceId)
    if (st && st.page < totalPages - 1) {
      _renderFanPage(sourceId, st.page + 1)
    }
  })

  div.appendChild(prevBtn)
  div.appendChild(counter)
  div.appendChild(nextBtn)
  return div
}

// ─── Exported API ─────────────────────────────────────────────────────────────

/** Remove all cards/pagination, reset page state, keep anchors. */
export function clearMap() {
  for (const sourceId of sourceCardState.keys()) {
    _removeFanCards(sourceId)
    anchorOpen.set(sourceId, false)
    const st = sourceCardState.get(sourceId)
    if (st) {
      st.open = false
      st.page = 0
      st.nodes = []
    }
  }
}

/** Reset camera to initial position/target. */
export function zoomToFit() {
  if (!camera || !controls) return
  camera.position.set(CAMERA_INIT.x, CAMERA_INIT.y, CAMERA_INIT.z)
  camera.lookAt(0, 0, 0)
  controls.target.set(0, 0, 0)
  controls.update()
}

/** Re-sync all cards from state.nodes (e.g. after filter change). */
export function refreshMap() {
  syncAllSourceCards()
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function _startRenderLoop() {
  function loop() {
    animFrameId = requestAnimationFrame(loop)
    controls.update()
    webglRenderer.render(scene, camera)
    css3dRenderer.render(scene, camera)
  }
  loop()
}

function _onResize() {
  if (!container || !camera || !webglRenderer || !css3dRenderer) return
  const w = container.clientWidth
  const h = container.clientHeight
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  webglRenderer.setSize(w, h)
  css3dRenderer.setSize(w, h)
}
