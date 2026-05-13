# Library Graph Explorer

Browser-based federated search tool. Queries multiple library/cultural-heritage APIs in parallel and renders results as a live 3D force-directed graph. No build step, no backend, no framework.

## Running

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

## Architecture

Vanilla JS ES modules + `3d-force-graph` (CDN, UMD global `ForceGraph3D`). Single `state` object is the source of truth; graph is a view over it.

```
index.html          — shell, CDN script tags, mounts src/main.js
src/
  main.js           — entry point, wires all modules together
  state.js          — singleton state object + localStorage helpers
  bus.js            — minimal pub/sub (on/emit/off)
  utils.js          — debounce, ID builders, fetchWithCorsFallback, cache
  sources.js        — SOURCES registry + all API adapters
  graph.js          — ForceGraph3D wrapper (add/clear/refresh/zoom)
  search.js         — search orchestration, JIT expansion, cross-source edge inference
  collection.js     — pin/unpin, annotations, JSON export/import
  ui.js             — all panel rendering and DOM event wiring
styles/main.css     — dark theme, CSS custom properties
```

## Key conventions

**State** (`src/state.js`): `state.nodes` and `state.edges` are `Map<id, object>`. These are the canonical source of truth; the graph gets a snapshot on each update.

**Adapters** (`src/sources.js`): Every `searchFn` has signature `async ({ query, limit, testing })` — a single options object. Callers pass `{ query }` (e.g. `source.searchFn({ query })`). The body has no implicit globals and can be lifted server-side without rewrites.

**API keys**: Read via getters from `localStorage` (`apiKey:<sourceId>`). Set through the ⚿ keys modal in the UI. Sources with empty keys return `[]` silently. Keyed sources: `trove`, `europeana`, `rijksmuseum`, `dpla`.

**CORS**: `fetchWithCorsFallback` in `utils.js` tries direct fetch first, then `allorigins.win`, then `corsproxy.io`. Met and LoC have working CORS and never hit the proxy in practice.

**Cross-source edges**: Inferred after each search/expansion by exact-lowercased string match on `rawSubjects` and `rawCreators`. Stored as `shared-subject` or `shared-creator` edges with `crossSource: true`; rendered with travelling-dot particles.

**Node IDs**: `<sourceId>::<record-id>` for results, `query::<lowercased-query>` for query nodes, `source::<sourceId>` for anchors. Same query string from two expansions reuses one query node.

**Mock sources**: `mock_a` and `mock_b` in `SOURCES` return synthetic data with overlapping subjects/creators, enabling cross-source edge testing without any API keys.

## Limits (v1)

- 500-node soft cap: banner shown, expansion disabled (no clustering)
- JIT depth limit: 3 hops from any query node
- Cross-source matching: exact lowercased only (no fuzzy/Levenshtein)
- New top-level search clears the graph; JIT expansion is additive
- Imported graphs are expansion-locked (annotations still editable)
- API keys are client-side only — use throwaway dev keys
