# Components

High-level map of the modules and how they interact.

## Module dependency graph

```
state.js ◄──────────────────────────────────────────────┐
utils.js ◄──────────────────────────────────────────┐   │
bus.js   ◄────────────────────────────────────────┐ │   │
                                                   │ │   │
sources.js   (imports utils)                       │ │   │
    ▼                                              │ │   │
graph.js     (imports state, bus, utils)  ─────────┘ │   │
    ▼                                                │   │
search.js    (imports graph, sources, state, bus, utils) │
    ▼                                                    │
collection.js (imports graph, sources, state, bus, utils)│
    ▼                                                    │
ui.js        (imports all of the above)                  │
    ▼                                                    │
main.js      (entry point — wires graph + ui + state) ───┘
```

`state.js`, `bus.js`, and `utils.js` are leaf modules with no imports. Everything else builds upward without circular dependencies.

## Module responsibilities

### `state.js`
The single source of truth. Holds `nodes`, `edges`, `collection`, filters, and UI flags as plain Maps/Sets. Exports `resetGraph()`, `loadCollectionFromStorage()`, `saveCollectionToStorage()`. See [state.md](./state.md).

### `bus.js`
Minimal pub/sub (`on`, `off`, `emit`). Used to decouple modules that would otherwise create circular imports — e.g. `search.js` emits `source:status` events that `ui.js` handles, without `search.js` needing to know about `ui.js`.

### `utils.js`
Stateless helpers: `debounce`, ID builders (`queryNodeId`, `sourceAnchorId`), `normalizeStr`, `truncate`, `fetchWithCorsFallback` (with proxy fallback chain), `cachedFetch`, `generateEdgeId`.

### `sources.js`
Source registry and all API adapters. Exports `SOURCES` array, `API_KEYS`, `getSource(id)`, `enabledSources()`. See [sources.md](./sources.md).

### `graph.js`
Thin wrapper around the `ForceGraph3D` instance. Responsible for:
- Initialising the graph with all visual accessors (colour, size, edge particles, visibility)
- `addToGraph(nodes, links)` — incremental add preserving existing node positions
- `clearGraph()`, `refreshGraph()`, `zoomToFit()`, `togglePhysics()`
- `makeQueryNode(queryStr)` and `makeSourceAnchor(source)` — node factories

The graph is a **view**: it receives snapshots of state data and renders them. It does not own state.

### `search.js`
Orchestrates all search activity:
- `runSearch(query)` — clears state, creates query node, fans out to all enabled sources via `Promise.allSettled`, adds results incrementally as each source resolves
- `expandNode(node)` — JIT expansion from a result node; checks depth limit (≤ 3 hops from any query node) and node cap (< 500) before firing
- `inferCrossSourceEdges(newNodes)` — after each batch of new nodes, checks `rawSubjects` and `rawCreators` against all existing nodes using exact lowercased string match; creates `shared-subject` / `shared-creator` edges with `crossSource: true` where applicable
- `getNodeDepth(nodeId)` — BFS from all query nodes simultaneously, returns minimum hop count

### `collection.js`
Manages the user's curated collection:
- `pinNode(node)` / `unpinNode(nodeId)` — adds/removes from `state.collection`, calls `saveCollectionToStorage()`
- `setAnnotation(nodeId, text)` — updates both collection entry and live node
- `exportCollection()` — serialises pinned nodes + their interconnecting edges to a JSON file download (spec §7.4 schema)
- `importGraph(data)` — loads an exported JSON, sets `state.importedMode = true` (disables expansion), rebuilds nodes/edges/anchors from file data

### `ui.js`
All DOM rendering and event wiring. No business logic — delegates to `search.js`, `collection.js`, and `graph.js`. Key sections:
- **Search bar**: debounced input → `runSearch()`
- **Detail panel** (right): renders on `node:click` bus event; wires pin, expand, link-mode, annotation, and clickable subject/creator tags
- **Collection drawer** (left): grouped by source; inline annotation editing; Find (centres camera) and Remove buttons
- **Source panel** (top-right): per-source colour swatch, enable toggle, live status from `state.sourceStatuses`
- **Controls** (bottom-left): zoom-to-fit, pause physics, label toggle, reset, source/type filter chips
- **Keys modal**: reads/writes `localStorage` via `setApiKey()`

### `main.js`
Entry point. Calls `initGraph()`, `loadCollectionFromStorage()`, `initUI()`, and exposes `resetGraph`/`clearGraph` on `window.__appModules` (the one place a circular import is avoided with a global).

## Data flow: search

```
User types query → ui.js debounce → runSearch(query)
  → resetGraph() + clearGraph()
  → makeQueryNode() → addToGraph()
  → for each enabled source:
      source.searchFn(query)
        → on resolve: makeSourceAnchor(), build nodes/edges, inferCrossSourceEdges()
        → addToGraph(newNodes, newEdges)          [incremental — graph grows live]
        → emit('source:status', ...)              [ui.js updates status chips]
```

## Data flow: node click → expand

```
ForceGraph3D click → emit('node:click', node)
  → ui.js shows detail panel
  → user clicks "Explore from here"
  → expandNode(node)
      → getNodeDepth() check (must be < 3)
      → node cap check (must be < 500)
      → same fan-out as runSearch() but additive (no clear)
```

## Bus events

| Event              | Emitted by     | Handled by           |
|--------------------|----------------|----------------------|
| `node:click`       | graph.js       | ui.js (detail panel) |
| `node:hover`       | graph.js       | ui.js (cursor)       |
| `background:click` | graph.js       | ui.js (close panel)  |
| `node:updated`     | search.js      | ui.js (re-render panel) |
| `source:status`    | search.js      | ui.js (status chips) |
| `search:start`     | search.js      | ui.js (clear panel)  |
| `search:done`      | search.js      | ui.js (zoom to fit)  |
| `collection:changed` | collection.js | ui.js (re-render drawer) |
| `node-cap:reached` | search.js      | ui.js (show banner)  |
| `import:done`      | collection.js  | ui.js (refresh all)  |
