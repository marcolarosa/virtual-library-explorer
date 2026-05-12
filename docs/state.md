# State

`src/state.js` exports a single module-level object that is the canonical source of truth for the entire application. No framework, no reactivity — modules read and mutate it directly, then call the relevant render functions or emit bus events.

## The `state` object

```js
state = {
  nodes:             Map<id, Node>
  edges:             Map<id, Edge>
  collection:        Map<nodeId, CollectionEntry>
  queryHistory:      string[]
  importedMode:      boolean
  nodeLimit:         number          // 500
  labelsVisible:     boolean
  physicsPaused:     boolean
  linkModeActive:    boolean
  linkModeSourceNode: Node | null
  filters: {
    hiddenSources:   Set<sourceId>
    hiddenTypes:     Set<nodeType>
  }
  sourceStatuses:    Map<sourceId, SourceStatus>
}
```

## Nodes

Every node in the graph is stored in `state.nodes`. Nodes are plain objects:

```js
{
  id:          string,    // globally unique — see ID scheme below
  label:       string,    // display text
  type:        string,    // 'work' | 'person' | 'subject' | 'place' | 'organisation' | 'query' | 'source'
  sourceId:    string,    // which institution produced this node
  color:       string,    // inherited from source
  result:      object,    // full normalised result (null for query/anchor nodes)
  rawSubjects: string[],  // used for cross-source edge inference
  rawCreators: string[],
  pinned:      boolean,
  expanded:    boolean,
  annotation:  string,
}
```

**ID scheme**

| Node kind      | Format                          | Example                        |
|----------------|---------------------------------|--------------------------------|
| Result         | `<sourceId>::<record-id>`       | `met::12345`                   |
| Query node     | `query::<lowercased query>`     | `query::bees`                  |
| Source anchor  | `source::<sourceId>`            | `source::trove`                |

Query nodes are deduplicated by ID — two expansions using the same query string share one node.

## Edges

Every edge is stored in `state.edges`. Edges are plain objects:

```js
{
  id:          string,
  source:      string,    // node id
  target:      string,    // node id
  type:        string,    // see table below
  crossSource: boolean,   // true when source and target have different sourceIds
  label:       string,    // subject heading or creator name that caused inference
}
```

| Type               | Meaning                                             |
|--------------------|-----------------------------------------------------|
| `query-to-result`  | Result was returned by this query node              |
| `result-to-anchor` | Result belongs to this source institution           |
| `shared-subject`   | Two results share an exact lowercased subject string |
| `shared-creator`   | Two results share an exact lowercased creator string |
| `user-link`        | User manually linked two nodes                      |

`crossSource: true` on `shared-subject` / `shared-creator` edges triggers the animated travelling-dot treatment in the graph renderer.

## Collection

`state.collection` persists independently of the graph — it survives a Reset and a page reload. Each entry:

```js
{
  annotation:  string,
  pinnedAt:    ISO8601 string,
  result:      object,       // snapshot of the full normalised result
  label:       string,
  sourceId:    string,
  color:       string,
  rawSubjects: string[],
  rawCreators: string[],
}
```

Persisted to `localStorage` under the key `library-explorer:collection` via `saveCollectionToStorage()`. Loaded on startup via `loadCollectionFromStorage()`.

## Filters

`state.filters.hiddenSources` and `state.filters.hiddenTypes` are Sets of IDs/type strings. The graph renderer calls `nodeVisibility` and `linkVisibility` based on these — nodes aren't removed from `state.nodes`, just hidden in the view.

## Source statuses

`state.sourceStatuses` is updated by `search.js` as each API call resolves. The UI reads it to render the per-source status chips.

```js
{ status: 'idle' | 'querying' | 'done' | 'error', count: number, latency: number }
```

## Lifecycle

```
loadCollectionFromStorage()   ← on startup
      ↓
runSearch(query)              ← top-level search: calls resetGraph(), clears nodes/edges
      ↓                          (collection is NOT cleared)
expandNode(node)              ← additive: new nodes/edges appended
      ↓
resetGraph()                  ← clears nodes, edges, queryHistory, sourceStatuses
                                 collection survives
```
