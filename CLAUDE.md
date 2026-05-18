# Library Explorer

Browser-based federated search tool. Queries multiple library/cultural-heritage APIs in parallel and displays results via an interactive 3D globe and detail panels. Vue 3 + Pinia stores, no build step, no backend framework.

## Running

```bash
npm install
npm run dev
# or
python3 -m http.server 8080
# open http://localhost:8080
```

## Architecture

Vue 3 + Pinia (SPA) + Three.js globe. Vite dev server or static HTTP.

```
index.html              — mount point for Vue app
src/
  main.js              — Vue app bootstrap with Pinia
  App.vue              — root component shell
  components/
    GlobeView.vue      — Three.js 3D globe with source anchors
    SearchBar.vue      — query input, submit
    SourcePanel.vue    — source selector, API key modal
    CollectionDrawer.vue — pinned items, export/import
    DetailPanel.vue    — selected node metadata
    IframePanel.vue    — external record viewer
    NodeCapWarning.vue — 500-node limit warning
  stores/
    graph.js           — nodes, query history, depth tracking, importedMode
    collection.js      — pinned items, annotations, localStorage sync
    sources.js         — source query statuses (status, latency, count, error)
    ui.js              — selectedNode, panel visibility, searchInProgress
  services/
    search.js          — runSearch, expandNode, query/result orchestration
    collection.js      — pinNode, unpinNode, export/import JSON
  mapview.js           — Three.js globe setup, raycasting, pulse animations
  sources.js           — SOURCES registry + all API adapters
  utils.js             — debounce, ID builders, fetchWithCorsFallback, cache
styles/main.css        — dark theme, CSS custom properties (Tailwind)
```

## Key conventions

**State** (Pinia stores): 
- `useGraphStore.nodes` — `Map<nodeId, node>`, canonical source of truth
- `useCollectionStore.items` — pinned items with annotations, auto-synced to localStorage
- `useSourcesStore.statuses` — source query metadata (status/latency/count/error)
- `useUIStore.*` — selectedNode, panel visibility, searchInProgress

**Nodes**: `<sourceId>::<record-id>` for results, `query::<lowercased-query>` for queries. Each node has `id`, `label`, `type`, `sourceId`, `color`, `depth`, `pinned`, `expanded`, `annotation`, and optional `result` (full record).

**Adapters** (`src/sources.js`): Every `searchFn` has signature `async ({ query, limit, testing })` — single options object. Callers pass `{ query }`. Body has no implicit globals; can be lifted server-side.

**API keys**: Read from `localStorage` (`apiKey:<sourceId>`). Set through keys modal in SourcePanel. Sources with empty keys return `[]` silently. Keyed sources: `trove`, `europeana`, `rijksmuseum`, `dpla`.

**CORS**: `fetchWithCorsFallback` tries direct fetch, then `allorigins.win`, then `corsproxy.io`. Met and LoC have native CORS.

**Globe interactions**: Three.js raycasting on source anchors (dots + spikes). Click focuses source, mouse hover shows pointer. Pulse animations on query status changes (active = searching, steady = has data).

## Limits

- 500-node soft cap: warning banner shown, expansion blocked
- Depth limit: 3 hops from root query node
- JIT expansion: each node can expand to a new query; reuses existing query nodes
- New top-level search clears graph; expansion is additive
- Imported graphs are read-only (no new expansions), annotations editable
- API keys are client-side only — use throwaway dev keys
