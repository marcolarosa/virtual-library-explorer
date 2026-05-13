# World Map View — Design Spec

**Date:** 2026-05-13
**Status:** Approved

## Overview

Replace the 3D force-directed graph with a Three.js world map view. Search results from each library source are anchored to the source's real-world geographic location and displayed as browsable card fans standing above the map surface. The camera looks down at the map at a fixed angle, with map-style pan and zoom navigation.

---

## 1. Architecture & Module Changes

### Modules changed

| File | Change |
|---|---|
| `src/graph.js` | Deleted — replaced by `src/mapview.js` |
| `src/mapview.js` | New — owns the Three.js scene, both renderers, all card objects |
| `src/main.js` | Swap `initGraph` → `initMap`; swap `addToGraph` → `addToMap`; swap `clearGraph` → `clearMap` |
| `src/state.js` | Remove `state.edges`, `physicsPaused`, `linkModeActive`, `linkModeSourceNode` |
| `src/search.js` | Remove `inferCrossSourceEdges()` call and all edge-building logic |
| `src/sources.js` | Add `lat` and `lng` fields to each source definition |
| `index.html` | Swap `3d-force-graph` CDN tag for Three.js core + `CSS3DRenderer` + `MapControls` addons |

### Modules with minor changes

| File | Change |
|---|---|
| `ui.js` | Remove link mode controls and any references to `linkModeActive` / `linkModeSourceNode` |
| `index.html` | Remove the pause-physics button (`#pause-physics`) — physics has no meaning in the map view |

### Modules unchanged

`bus.js`, `collection.js`, `utils.js` — no changes required. Bus events (`node:click`, `node:hover`, `background:click`) are still emitted from `mapview.js` with the same payloads.

### Renderer stacking

Two renderers share `#graph-container`:

- `THREE.WebGLRenderer` — renders the map plane (bottom layer)
- `THREE.CSS3DRenderer` — renders HTML cards (top layer, stacked via `position: absolute`)

The WebGL canvas has `pointer-events: none`; the CSS3D canvas receives all pointer events and passes background clicks through to the WebGL layer via a transparent background.

---

## 2. Map Geometry & Coordinate System

### Geometry

A single `THREE.PlaneGeometry(360, 180)` rotated `-Math.PI / 2` on the X axis so it lies flat in the XZ plane. Units are degrees: 1 Three.js unit = 1 geographic degree.

### Coordinate conversion

```
x =  lng          (–180 west → +180 east)
z = –lat          (–90 south → +90 north, flipped for Three.js Z axis)
y =  0            (map surface)
```

Converting a `{ lat, lng }` to a scene position: `new THREE.Vector3(lng, 0, -lat)`.

### Texture

An equirectangular world map PNG committed to the repo at `assets/world-map.png` (source: Natural Earth 1:110m raster, public domain). Loaded via `THREE.TextureLoader`. The plane uses a dark ocean fallback colour (`#080c10`) before the texture loads. The map is non-interactive — all interaction is on anchors and cards.

---

## 3. Source Anchors & Card Fan Layout

### Source anchors

Each source in the `SOURCES` registry gets a `lat` and `lng` field (e.g., Trove → `{ lat: -35.3, lng: 149.1 }` for the National Library of Australia in Canberra). On `initMap()`, one anchor marker is created per source — a small `THREE.CylinderGeometry` mesh coloured with `source.color`, positioned at the source's map coordinate. Anchors are always visible, even before any search, so the map acts as a directory of sources.

Clicking an anchor toggles the card fan open or closed.

### Card fan

Cards are `CSS3DObject` instances wrapping a `<div>`. Each card shows:
- Source colour badge + source name
- Result title
- Date (if available)
- Thumbnail (if available)

Cards stand vertically — their base at `y = 0`, rising upward — so they're visible from the default camera angle. Each card's Y-axis rotation faces outward along the fan arc so cards face roughly toward the camera.

### Fan geometry

Fan arc: **120°**, centered on the direction from the anchor toward the camera's default position (so the fan faces the viewer). Cards are spaced evenly across the arc at a fixed radius of ~15 units from the anchor.

### Pagination

The fan shows **10 cards per page**. The anchor marker displays a `current / total` counter (e.g., `3 / 35`). Prev/next arrow controls on the anchor cycle through pages. Page state is stored per-source in `mapview.js` local state (not in `state.js`).

---

## 4. Camera & Controls

### Camera

`THREE.PerspectiveCamera` with 50° field of view, initial position approximately `(0, 120, 80)`, looking toward `(0, 0, 0)`. This gives a "looking at a tilted tabletop" angle — map recedes into the distance, foreground cards stand tall.

The camera's pitch is locked: it always points at the `y = 0` plane and never tilts up or down. The tilt angle is defined by a constant at the top of `mapview.js` so it can be tuned without searching the code.

### Controls

`MapControls` from Three.js (pan-only variant of `OrbitControls`):

- **Drag** — pans camera across the map, no rotation
- **Scroll wheel** — zooms in/out
- **Min zoom** — clamped so the map fills the screen
- **Max zoom** — clamped so individual cards remain readable

### Zoom to fit

The existing zoom-to-fit button resets the camera to the default world overview position (`(0, 120, 80)` targeting origin).

---

## 5. Data Flow

1. `initMap()` — creates the Three.js scene, both renderers, and source anchor markers for all sources. Anchors are created from the `SOURCES` registry.
2. User searches → `search.js` populates `state.nodes` and emits `graph:update` on the bus (name unchanged for bus compatibility).
3. `mapview.js` listens to `graph:update`, reads `state.nodes`, groups nodes by `sourceId`, and calls an internal `syncSourceCards(sourceId)` for each source with new results.
4. `syncSourceCards()` creates or replaces `CSS3DObject` card instances for that source, resets pagination to page 1, and positions the first page of cards in the fan arc.
5. `clearMap()` — destroys all card objects and resets per-source pagination, but leaves anchor markers in place.
6. Card click → emits `node:click` on the bus. Detail panel and collection behaviour are unchanged.
7. Card mouseenter → emits `node:hover` on the bus.

### Edges removed

`state.edges` is removed. `search.js` no longer calls `inferCrossSourceEdges()`. No edge-related rendering or logic exists in the map view.

---

## 6. What's Not Changing

- `ui.js` — search bar, detail panel, collection drawer, source panel, filter chips, status bar all unchanged (link mode controls removed per section 1)
- `bus.js` — event names and payloads unchanged
- `collection.js` — pin/unpin, annotations, import/export unchanged
- `search.js` (search orchestration) — API calls, JIT expansion, result normalisation unchanged
- `sources.js` adapters — only `lat`/`lng` fields added to source configs
- API key handling, CORS fallback, caching — all unchanged

---

## Out of Scope (v1)

- Cross-source shared-subject/shared-creator highlighting (no edges in map view)
- Per-result geo coordinates (all results from a source share the source's anchor)
- Clustering when sources are geographically close
- Mobile/touch controls
