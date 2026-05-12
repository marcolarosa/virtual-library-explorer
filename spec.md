# Federated Library Graph Explorer — v1 Specification

**Version:** 1.0  
**Target:** Single-page application, runs entirely in the browser  
**Implementation target:** Claude Code

---

## 1. Overview

A browser-based knowledge exploration tool that queries multiple library and cultural heritage search endpoints simultaneously using plain keyword search, visualises results as a growing 3D force-directed graph, and allows users to curate, annotate, and publish cross-source collections as portable JSON graphs.

The system deliberately avoids requiring shared data models, authority file mappings, or linked data infrastructure. Every source is treated as a dumb keyword search endpoint. Serendipitous connection is the goal, not semantic precision.

---

## 2. Core Principles

- **Lowest common denominator federation:** All sources are queried via keyword search only. No SPARQL, no authority file alignment, no schema mapping required.
- **Provenance as first-class citizen:** Every node and edge in the graph carries and displays its source institution.
- **JIT expansion:** The graph grows on demand as users explore. Nothing is pre-fetched beyond the initial query.
- **Portable outputs:** A user's curated collection is a self-contained JSON file that can be shared and re-opened in the same application.
- **No backend required:** All queries run client-side via public APIs. No server, no database, no authentication infrastructure for v1.

---

## 3. Architecture

### 3.1 Technology Stack

| Concern | Library / Approach |
|---|---|
| 3D graph visualisation | `3d-force-graph` (via CDN) |
| HTTP requests | Native `fetch` with CORS proxy fallback |
| State management | Vanilla JS module pattern (no framework) |
| Persistence | `localStorage` for session state; JSON export/import for sharing |
| Styling | CSS custom properties; no framework |
| Bundling | None — single `index.html` file with inline or co-located scripts |

### 3.2 File Structure

```
index.html          — Main application shell
src/
  graph.js          — Force graph initialisation and node/edge management
  sources.js        — Source registry and query adapters
  search.js         — Orchestration of parallel JIT queries
  collection.js     — Curation, annotation, export/import logic
  ui.js             — Panel, sidebar, and control rendering
  utils.js          — Debounce, deduplication, colour assignment
styles/
  main.css          — Application styles
```

For v1, these may be inlined into a single `index.html` if simpler for deployment.

---

## 4. Source Registry

### 4.1 Structure

Sources are defined as a JavaScript array of source objects. Each source has:

```js
{
  id: 'trove',                        // unique short identifier
  label: 'Trove',
  shortLabel: 'Trove',
  country: 'AU',
  region: 'Oceania',
  color: '#2ecc71',                   // assigned colour for all nodes from this source
  baseUrl: 'https://...',
  searchFn: async (query) => [...],   // returns array of normalised Result objects
  enabled: true
}
```

**API key handling:** Sources that require keys read them from a module-level config object (e.g. `API_KEYS.trove`). In v1 these are hardcoded constants in `sources.js`. Each `searchFn` should treat the key as an injected parameter so the same function body can be lifted server-side in a later version without rewrites — i.e. structure adapters as `searchFn(query, { apiKey, fetch })` rather than reading globals directly.

### 4.2 Normalised Result Object

Every source adapter must return results in this common shape:

```js
{
  id: String,             // source-scoped unique ID (e.g. 'trove::bib-123456')
  title: String,
  type: String,           // 'work' | 'person' | 'subject' | 'place' | 'organisation' | 'unknown'
  description: String,    // short snippet or abstract, may be empty
  date: String,           // year or date string, may be empty
  url: String,            // link to source record
  thumbnailUrl: String,   // optional image
  sourceId: String,       // matches source.id
  rawSubjects: [String],  // subject heading strings, used for soft edge inference
  rawCreators: [String],  // creator/author name strings
  rawRelated: [String],   // any other related label strings the API returns
}
```

### 4.3 v1 Source List

The following sources are hardcoded for v1. Each requires a `searchFn` adapter written against its public API.

| ID | Institution | API Type | Notes |
|---|---|---|---|
| `trove` | Trove (NLA, includes SLV) | REST/JSON | Requires free API key; covers all Australian state libraries |
| `europeana` | Europeana | REST/JSON | Requires free API key; 50M+ European objects |
| `dpla` | Digital Public Library of America | REST/JSON | Requires free API key; US collections |
| `met` | The Metropolitan Museum of Art | REST/JSON | Open access, no key required |
| `rijksmuseum` | Rijksmuseum | REST/JSON | Requires free API key |
| `loc` | Library of Congress | REST/JSON | No key required |

**BnF / sub-source filtering:** Earlier drafts listed `europeana_bnf` as a separate source. In v1 this is implemented as a **client-side filter** over `europeana` results (by data provider field), not a second adapter — issuing two queries to the same upstream would waste calls. Surface it as a UI filter chip, not a registered source.

**Extensibility:** New sources are added by pushing a new source object into the `SOURCES` array in `sources.js`. No other code changes required.

### 4.4 CORS Handling

Many library APIs do not set permissive CORS headers. For v1, use a public CORS proxy (`https://corsproxy.io/` or `https://api.allorigins.win/`) as a fallback when a direct request fails. This is noted as a v1 limitation; a lightweight proxy worker (e.g. Cloudflare Worker) is the v2 solution.

**Security note:** When the proxy fallback is hit, the full request URL (including any API key in the query string) is visible to the proxy operator and may be logged. Do **not** use production / rate-limited keys for v1; use throwaway dev keys. This is the second motivation (after CORS itself) for moving adapters server-side in v2.

---

## 5. Graph Model

### 5.1 Node Types

| Type | Shape | Size | Label |
|---|---|---|---|
| `work` | Sphere | Medium | Title (truncated) |
| `person` | Octahedron | Medium | Name |
| `subject` | Torus / ring | Large | Heading text |
| `place` | Cube | Medium | Place name |
| `organisation` | Cylinder | Medium | Name |
| `query` | Icosahedron | Large | Query string |
| `source` | Large sphere (anchor) | X-Large | Institution short label |

### 5.2 Node Properties

Every node carries:

```js
{
  id: String,           // globally unique across all sources
  label: String,
  type: String,
  sourceId: String,     // which institution
  color: String,        // inherited from source
  result: Object,       // full normalised result object
  pinned: Boolean,      // user has pinned this to their collection
  annotated: Boolean,   // user has added a note
  annotation: String,
  expanded: Boolean,    // user has triggered JIT expansion on this node
  x, y, z: Number      // force layout positions
}
```

**ID schemes (globally unique):**
- Result nodes: `<sourceId>::<source-record-id>` (e.g. `trove::bib-123456`)
- Source anchor nodes: `source::<sourceId>` (e.g. `source::trove`)
- Query nodes: `query::<lowercased-trimmed-query-string>` — querying the same string twice reuses the same query node rather than duplicating it.

### 5.3 Edge Types

| Type | Meaning | Style |
|---|---|---|
| `query-to-result` | Result came from this query | Solid, source colour |
| `shared-subject` | Two results share a subject heading string | Dashed, neutral |
| `shared-creator` | Two results share a creator name string | Dotted, neutral |
| `user-link` | User has manually linked two nodes | Gold, thick |

**Cross-source as attribute, not type:** An edge has a single `type`. The cross-source quality is a boolean **attribute** (`crossSource: true`) set on `shared-subject` / `shared-creator` edges when the two endpoints have different `sourceId` values. Rendering uses the attribute to apply the glowing/animated treatment on top of the base edge style.

**Cross-source edge detection:** After each JIT expansion, compare the `rawSubjects` and `rawCreators` arrays of new nodes against all existing nodes. For v1, use **exact lowercased-and-trimmed string match** only — no Levenshtein, no fuzzy matching. This keeps the inference cheap and predictable for the prototype; fuzzy matching is deferred to v2 alongside opt-in authority-file resolution.

### 5.4 Source Anchor Nodes

Each source that has returned at least one result gets a large **anchor node** representing the institution. All result nodes from that source connect to their anchor. Anchors are positioned in loosely geographic clusters (AU/Pacific to the right, Europe to the left, Americas centre-left) using initial force position hints, though the force simulation is free to move them.

This means provenance is always spatially legible — you can see the "Australian cluster" and the "European cluster" and the bridges between them.

---

## 6. User Interactions

### 6.1 Initial Search

1. User types a query into the search box and presses Enter.
2. **A top-level search starts a fresh graph** — existing nodes and edges (except the user's persisted collection) are cleared. Use "Expand from here" (§6.2) for additive exploration, the search box for starting over.
3. All enabled sources are queried in parallel (Promise.allSettled).
4. As each source resolves, its nodes and edges are added to the graph incrementally — the graph grows in real time as responses arrive.
5. A status bar shows per-source state: `querying` → `N results` or `failed`.
6. A central **query node** is placed at the origin, with edges radiating to all result nodes.

### 6.2 Node Expansion (JIT)

1. User clicks any result node.
2. A side panel opens showing full metadata for that result.
3. An **"Explore from here"** button triggers a JIT expansion: the node's title (or first subject heading) is used as a new keyword query, fired against all enabled sources.
4. New results are added to the graph, connected back to the expanded node. The expanded node is marked visually (ring indicator). If the expansion's query string matches an existing query node's ID scheme (§5.2), it is **reused** rather than duplicated.
5. The new query string does not overwrite the original — expansions accumulate. The graph is additive within a session, until a new top-level search (§6.1) or Reset (§6.4) clears it.

**Depth limit:** "Depth" is the shortest-path hop count from a node to *any* query node currently in the graph. The 3-hop limit (§9) prevents expansion from nodes already 3+ hops away from every query node; the UI disables the Expand button in that case.

### 6.3 Node Detail Panel

Slides in from the right on node click. Contains:
- Title, type badge, source badge (coloured)
- Description/snippet
- Date, creators, subjects as clickable tags
- Thumbnail if available
- Link to original record (opens in new tab)
- **Pin to collection** toggle
- **Add annotation** text field
- **Expand from here** button
- **Link to another node** (activates link mode — next node clicked gets a `user-link` edge)

### 6.4 Graph Controls

A minimal control overlay (bottom-left):
- **Zoom to fit** button
- **Pause / resume** physics simulation toggle
- **Show/hide labels** toggle
- **Filter by source** — toggles per source, dims/hides nodes from deselected sources
- **Filter by node type** — toggles work / person / subject / place etc.
- **Reset graph** — clears all nodes and edges, returns to empty state. **The persisted collection (§7.1) is preserved** — Reset only affects the visible graph, not pinned items.

### 6.5 Source Panel

A collapsible panel (top-right) showing:
- Each registered source with its colour swatch
- Enabled/disabled toggle
- Status of last query (idle / querying / N results / error)
- Latency of last response

---

## 7. Collection Management

### 7.1 Pinning

Any node can be pinned to the user's active collection via the detail panel. Pinned nodes are rendered with a gold outline. The collection is persisted to `localStorage` and survives page reload.

### 7.2 Annotation

Pinned nodes can receive a free-text annotation. Annotations are stored in the collection alongside the node data.

### 7.3 Collection Panel

A drawer (left side) listing all pinned nodes:
- Grouped by source
- Editable annotations inline
- Drag to reorder
- Remove from collection button

### 7.4 Export (Publish)

**Export as JSON Graph** button produces a self-contained JSON file:

```json
{
  "version": "1.0",
  "meta": {
    "created": "ISO8601 timestamp",
    "query_history": ["bees", "apiculture", "honey trade"],
    "description": "User-provided description (optional)"
  },
  "sources": [
    { "id": "trove", "label": "Trove", "color": "#..." }
  ],
  "nodes": [
    {
      "id": "...",
      "label": "...",
      "type": "work",
      "sourceId": "trove",
      "annotation": "User note here",
      "result": { ...full normalised result... }
    }
  ],
  "edges": [
    {
      "source": "node-id-a",
      "target": "node-id-b",
      "type": "shared-subject",
      "label": "Apiculture"
    }
  ]
}
```

### 7.5 Import

A **Load graph** button accepts a previously exported JSON file and re-renders the collection graph. The imported graph is **expansion-locked** — "read-only" here means *JIT expansion is disabled* on imported nodes (the Expand button is hidden / disabled). Annotations can still be edited, nodes can be pinned/unpinned, and the result can be re-exported. This is the **sharing / publishing** mechanism — pass the JSON file to a colleague who opens it in the same application.

---

## 8. Visual Design

### 8.1 Aesthetic Direction

Dark canvas — near-black background (`#080c10`). The graph floats in space. Source colours are the primary chromatic language. Typography is monospaced for data labels, humanist sans for prose UI. The overall feel is **scientific instrument meets archival reading room**: precise, purposeful, slightly austere.

### 8.2 Colour Assignment

Sources are assigned colours from a perceptually distinct palette at registration time. Suggested palette (expandable):

```
Trove (AU):         #2ecc71  emerald
Europeana (EU):     #3498db  cobalt
DPLA (US):          #e74c3c  crimson
Met (US):           #f39c12  amber
Rijksmuseum (NL):   #9b59b6  violet
LoC (US):           #1abc9c  teal
BnF (FR):           #e67e22  burnt orange
```

### 8.3 Cross-Source Edge Treatment

Cross-source edges pulse with a travelling dot animation (implemented via animated `dashOffset` on the edge line), colour-blended between the two source colours. This makes federation bridges viscerally visible.

### 8.4 Node States

| State | Visual treatment |
|---|---|
| Default | Source colour, base opacity |
| Hovered | Scale up 1.3x, label always visible |
| Selected | White ring, panel opens |
| Expanded | Dashed ring indicator |
| Pinned | Gold outer ring |
| Loading (JIT) | Pulsing opacity |

---

## 9. Performance Constraints

- **Node cap (v1):** soft-cap at **500 nodes**. When exceeded, surface a warning banner and disable further JIT expansion until the user resets or removes nodes. The clustering behaviour (low-degree nodes collapsing into per-source cluster nodes) described in earlier drafts is **deferred to v2** — implementing it well is out of scope for a prototype.
- Edge rendering: use `3d-force-graph`'s `linkVisibility` to hide edges below a minimum weight when the graph exceeds 200 edges.
- JIT expansion depth limit: **3 hops** from any query node (see §6.2). Enforced to prevent runaway graph growth. A UI indicator shows current depth.
- API calls: debounce search input at 400ms. Cache responses by (sourceId + query string) in `sessionStorage` for the duration of the browser session.
- Cross-source edge inference is O(new × existing) string comparisons per expansion. With exact-lowercased matching only (§5.3) this is cheap enough at the 500-node cap; revisit if v2 introduces fuzzy matching.

---

## 10. v1 Limitations and v2 Notes

| Limitation | v2 Direction |
|---|---|
| CORS proxies are public and rate-limited | Deploy a lightweight Cloudflare Worker proxy |
| No user accounts — collections live in localStorage only | Add optional anonymous cloud persistence |
| Cross-source edges use exact lowercased match only | Add Levenshtein/fuzzy matching, plus opt-in Wikidata QID resolution for stronger identity |
| Node cap at 500 (no clustering) | Implement per-source low-degree cluster nodes |
| No mobile support | Responsive layout pass + touch interaction for 3D canvas |
| Import graphs are read-only | Allow JIT expansion from imported graph nodes |
| API keys hardcoded in client JS | Move to environment config or a thin backend |

---

## 11. Implementation Notes for Claude Code

- Use `3d-force-graph` from CDN: `https://unpkg.com/3d-force-graph`
- Use `three.js` (bundled with 3d-force-graph) for custom node geometries
- All source adapters in `sources.js` should be independently testable — each `searchFn` can be called and inspected in the browser console
- **Adapter signature:** write `searchFn(query, { apiKey, fetch })` (or equivalent dependency-injected form) so the adapter body has no implicit dependency on `window` globals or hardcoded keys. This makes the same code reusable behind a server-side proxy in v2 without rewrites.
- Start with 2 sources working end-to-end (suggest: Met Museum + LoC — neither requires an API key) before wiring keyed sources
- The graph state (all nodes and edges) should be held in a single module-level object for easy serialisation to the export format
- Implement the export/import cycle early — it validates the data model before the UI is complete
- Implement a **mock source** that returns synthetic data for offline development and testing — useful before any real API is wired up
- **Type inference reality check:** most library API responses don't cleanly split into `work | person | subject | place | organisation`. Expect almost everything to land as `work` in v1. The richer types (person, subject) mostly come into play via `rawSubjects` / `rawCreators` shared-edge inference, not as primary node types.

---

## 12. Out of Scope for v1

- User authentication or accounts
- Collaborative real-time editing of collections
- Semantic enrichment (NLP, entity extraction)
- Mobile-first layout
- Accessibility (WCAG compliance) — noted as important but deferred
- More than one simultaneous open collection
