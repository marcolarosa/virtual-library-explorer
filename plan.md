# Library Explorer v1 — Build Plan

## Context

This is a greenfield prototype. The working directory contains only `spec.md` — a detailed specification (just refined in this session) for a browser-based federated library/cultural-heritage graph explorer. The goal is to ship a working v1 prototype as **simply and quickly as possible**, following the spec exactly. No backend, no build step, no framework — vanilla JS + `3d-force-graph` from CDN, served as a static page.

Spec-driven contradictions and missing edge cases have already been resolved in `spec.md` itself (top-level search clears the graph; cross-source is an edge attribute not a type; `europeana_bnf` dropped as a source; exact-lowercased matching only; 500-node soft cap with no clustering; clarified ID schemes; etc.). This plan executes against the resolved spec.

## Approach

Static SPA, single `index.html` shell with co-located source files under `src/` and `styles/`. Served with `python -m http.server` (or any static host) for dev. State held in a single module-level object for trivial serialisation. Build out behind a mock source first, validate the export/import round-trip before any real API is wired, then add real sources one at a time starting with the keyless ones.

## Critical files to create

| File | Purpose |
|---|---|
| `index.html` | App shell. CDN `<script>` for `3d-force-graph`. Mounts canvas, search bar, panels. |
| `src/state.js` | Single module-level `state` object: `{ nodes, edges, sources, collection, queryHistory, importedMode }`. Pub/sub or direct mutate-then-render. |
| `src/graph.js` | Wraps `3d-force-graph` instance. `addNode`, `addEdge`, `removeNode`, `render`, node geometry/colour resolution, cross-source edge styling. |
| `src/sources.js` | `SOURCES` array + `API_KEYS` constants. Each adapter exports `searchFn(query, { apiKey, fetch })`. Includes one `mock` source for offline dev. |
| `src/search.js` | Orchestrates `Promise.allSettled` fan-out. Handles incremental rendering as adapters resolve. Owns query-node / source-anchor creation, cross-source edge inference (exact lowercased match on `rawSubjects` / `rawCreators`), depth-limit checks. |
| `src/collection.js` | Pin/unpin, annotation CRUD, `localStorage` persistence, JSON export per §7.4 schema, JSON import with expansion-lock flag. |
| `src/ui.js` | Detail panel (right), collection drawer (left), source panel (top-right), controls overlay (bottom-left), status bar, key-management modal. |
| `src/utils.js` | Debounce, ID builders (`queryNodeId`, `sourceNodeId`), CORS-proxy `fetch` wrapper, colour helpers, normalised-string helper for edge matching. |
| `styles/main.css` | Dark canvas, custom properties for source colours, panel styles, monospace for data / humanist sans for prose. |

## Build phases

### Phase 1 — Skeleton
- `index.html` with dark canvas, search box, empty panels.
- CDN script for `3d-force-graph`.
- `state.js` + render loop wired to a no-op data source. Open in browser and confirm a blank 3D canvas with controls.

### Phase 2 — Mock source end-to-end
- Implement `mock` source returning ~10 synthetic results with `rawSubjects` / `rawCreators` overlap so cross-source edges have something to bind on.
- `search.js`: query node creation at origin, source anchor creation, result nodes, `query-to-result` and result-to-anchor edges added incrementally.
- Confirm visual layout. **No real network code yet.**

### Phase 3 — Detail panel + JIT expansion
- Click handler opens right panel with title/badge/snippet/links.
- "Expand from here" triggers JIT expansion; reuses existing query node by ID (§5.2) if string matches.
- Depth-limit enforcement (shortest path to any query node ≤ 3).
- Cross-source edge inference on each expansion (exact lowercased match only).

### Phase 4 — Export / Import round-trip
- Export per §7.4 schema. Import re-renders with `importedMode: true`, hides Expand button, allows pin/annotate/re-export.
- Validate by exporting from mock graph, refreshing, importing, confirming identical render.

### Phase 5 — Real sources, keyless first
Adapters implemented with `searchFn(query, { apiKey, fetch })` signature so v2 can lift them server-side:
1. `met` (Met Museum) — no key.
2. `loc` (Library of Congress) — no key.
3. CORS-proxy fallback wrapper (`fetchWithCorsFallback`) — try direct, fall back to `corsproxy.io` on CORS failure. Surface a per-source warning when fallback was used (key-exposure note per §4.4).
4. `trove` (Trove) — key from `API_KEYS.trove`.
5. `europeana` (Europeana) — key from `API_KEYS.europeana`.
6. `rijksmuseum` — key from `API_KEYS.rijksmuseum`.
7. `dpla` — key from `API_KEYS.dpla`.
8. BnF filter chip over `europeana` results (not a separate adapter, per §4.3).

A simple modal or a `keys.local.js` (gitignored) lets the user paste keys into `localStorage`; `API_KEYS` reads from there with fallback to empty strings. Sources with empty keys disable themselves automatically.

### Phase 6 — Collection (pin / annotate / persist)
- Pin toggle in detail panel → gold-ring node treatment.
- Inline annotation editing.
- `localStorage` persistence (`library-explorer:collection`).
- Collection drawer (left side) listing pinned nodes grouped by source, with remove + reorder buttons (use up/down buttons, skip drag-to-reorder for prototype).
- Reset Graph preserves the collection (§6.4).

### Phase 7 — Controls & filters
- Zoom-to-fit, pause physics, toggle labels.
- Per-source toggles + per-type toggles (dim/hide via `nodeVisibility`).
- BnF data-provider filter (Europeana subset) lives here as a filter chip.
- Reset Graph button.

### Phase 8 — Visual polish
- Per-type geometries (sphere/octahedron/torus/cube/cylinder/icosahedron) via three.js custom `nodeThreeObject`.
- Cross-source edge animation: `linkDirectionalParticles` (travelling-dot effect) on edges where `crossSource === true`.
- Source-colour palette per §8.2.
- Node states (hovered/selected/expanded/pinned/loading) per §8.4.

### Phase 9 — Performance gates
- 400ms debounce on search input.
- `sessionStorage` response cache keyed by `sourceId + query`.
- 500-node soft cap → banner + Expand button disabled when reached (§9).
- `linkVisibility` cutoff for >200 edges.

## Deferred to v2 (explicitly out of scope)

- Levenshtein / fuzzy cross-source matching.
- 500+ node clustering behaviour.
- Drag-to-reorder collection items.
- Mobile / touch / accessibility.
- Server-side adapters (but written in a shape that lifts cleanly).

## Verification

- **Static serve:** `cd /Users/mlarosa/src/library-explorer && python3 -m http.server 8080` and open `http://localhost:8080/`.
- **End-to-end happy path (after Phase 5):**
  1. Type a query (e.g. "bees"). Confirm all enabled sources show `querying → N results` in the status panel.
  2. Confirm nodes appear incrementally as each source resolves.
  3. Confirm a central query node + per-source anchor nodes are present.
  4. Click a result → detail panel opens; pin it; confirm gold ring appears.
  5. Click "Expand from here" on a result → new sub-query fans out, expanded node gets a dashed ring.
  6. Confirm at least one `cross-source` edge appears between two different sources sharing a subject heading (mock source is seeded to guarantee this; real sources will produce them organically).
  7. Type a new top-level query → confirm graph resets, collection drawer still shows the previously pinned item.
- **Export/Import (after Phase 4):**
  1. Pin two or three nodes, annotate one, click Export → JSON downloads.
  2. Reload page, click Load Graph, select the JSON → confirm graph re-renders with pinned items and annotations intact.
  3. Confirm Expand button is hidden in imported mode.
- **Depth limit:** Expand 3 times along a chain → confirm 4th-hop node has Expand disabled.
- **Soft cap:** Repeatedly expand until 500 nodes → confirm banner appears and Expand is globally disabled.
- **CORS fallback:** In devtools network tab, force-fail a direct request → confirm fallback through proxy succeeds and a warning is logged for that source.
- **Adapter isolation:** In browser console, call `SOURCES.find(s=>s.id==='met').searchFn('cat', { fetch })` directly and inspect the normalised result array.
