# Sources

`src/sources.js` defines the registry of search endpoints and the adapter function for each one. Adding a new source requires only pushing a new object into `SOURCES` — no other code changes.

## Source object shape

```js
{
  id:          string,    // short unique key, used in node IDs and localStorage
  label:       string,    // full institution name
  shortLabel:  string,    // displayed in badges and status chips
  country:     string,    // ISO 3166-1 alpha-2
  region:      string,    // 'Americas' | 'Europe' | 'Oceania' | 'Mock'
  color:       string,    // hex — applied to all nodes from this source
  searchFn:    function,  // async (query, { apiKey, fetch }?) => NormalisedResult[]
  enabled:     boolean,
  requiresKey: boolean,   // optional — controls UI key-warning indicator
}
```

## Normalised result shape

Every `searchFn` must return an array of objects in this shape:

```js
{
  id:           string,    // '<sourceId>::<source-record-id>'
  title:        string,
  type:         string,    // 'work' | 'person' | 'subject' | 'place' | 'organisation' | 'unknown'
  description:  string,
  date:         string,
  url:          string,
  thumbnailUrl: string,
  sourceId:     string,
  rawSubjects:  string[],  // used for cross-source edge inference
  rawCreators:  string[],
  rawRelated:   string[],
}
```

`rawSubjects` and `rawCreators` are the only fields used for cross-source edge inference. They should be whatever subject headings and creator/author strings the API provides — no normalisation required at the adapter level.

## Adapter signature

```js
async function exampleSearchFn(query, { apiKey = API_KEYS.example, fetch: f = fetch } = {}) {
  // ...
}
```

The second parameter is dependency-injected so that:
- The adapter reads no implicit globals
- The same function body can be called from a server-side proxy in v2 without modification
- `apiKey` defaults to the current localStorage value if not explicitly provided

Adapters that require a key return `[]` immediately when the key is an empty string.

## API keys

```js
export const API_KEYS = {
  get trove()       { return localStorage.getItem('apiKey:trove')       || '' },
  get europeana()   { return localStorage.getItem('apiKey:europeana')   || '' },
  get dpla()        { return localStorage.getItem('apiKey:dpla')        || '' },
  get rijksmuseum() { return localStorage.getItem('apiKey:rijksmuseum') || '' },
}
```

Keys are stored in `localStorage` under `apiKey:<sourceId>`. Using getters means a key set mid-session is picked up on the next search without a reload. Keys are set via the ⚿ modal in the UI (`setApiKey(name, value)` in sources.js).

## Registered sources

| ID            | Institution                        | Key required | Notes                                  |
|---------------|------------------------------------|:------------:|----------------------------------------|
| `mock_a`      | Archive Mock                       | —            | Synthetic Victorian natural history data |
| `mock_b`      | Library Mock                       | —            | Overlapping subjects with mock_a       |
| `met`         | Metropolitan Museum of Art         | —            | Two-step: search IDs, then fetch each object |
| `loc`         | Library of Congress                | —            | JSON search API, `&fo=json`            |
| `trove`       | Trove (NLA)                        | ✓            | Covers Australian state libraries      |
| `europeana`   | Europeana                          | ✓            | 50M+ European objects                  |
| `rijksmuseum` | Rijksmuseum                        | ✓            | Dutch national art collection          |
| `dpla`        | Digital Public Library of America  | ✓            | Aggregates US cultural institutions    |

**Free keys:** Trove — [trove.nla.gov.au/about/create-something/using-api](https://trove.nla.gov.au/about/create-something/using-api) · Europeana — [apis.europeana.eu](https://apis.europeana.eu) · Rijksmuseum — [data.rijksmuseum.nl](https://data.rijksmuseum.nl) · DPLA — [dp.la/info/developers/codex](https://dp.la/info/developers/codex)

## CORS and caching

All adapters call `fetchWithCorsFallback(url)` from `utils.js`, which:

1. Tries the direct URL
2. Falls back to `allorigins.win` proxy
3. Falls back to `corsproxy.io` proxy

Met and LoC have working CORS headers and never hit the proxy path in practice. Trove, Europeana, Rijksmuseum, and DPLA may use the proxy depending on browser/network.

Responses are cached in-memory (session-scoped) keyed by `<sourceId>::<query>` via `cachedFetch`. Repeating the same query within a session hits the cache and makes no network request.

## Adding a new source

1. Write an async adapter function that returns `NormalisedResult[]`
2. If a key is needed, add a getter to `API_KEYS`
3. Push a source object into `SOURCES`

```js
async function newSourceSearchFn(query, { apiKey = API_KEYS.newSource } = {}) {
  if (!apiKey) return []
  return cachedFetch(`newsource::${query}`, async () => {
    const { data } = await fetchWithCorsFallback(
      `https://api.example.org/search?q=${encodeURIComponent(query)}&key=${apiKey}`
    )
    return (data.items || []).map(item => ({
      id: `newsource::${item.id}`,
      title: item.name,
      type: 'work',
      description: item.summary || '',
      date: item.year || '',
      url: item.link || '',
      thumbnailUrl: item.image || '',
      sourceId: 'newsource',
      rawSubjects: item.subjects || [],
      rawCreators: item.creators || [],
      rawRelated: [],
    }))
  })
}

// In SOURCES array:
{
  id: 'newsource', label: 'New Source', shortLabel: 'NS',
  country: 'XX', region: 'Europe', color: '#aabbcc',
  searchFn: newSourceSearchFn, enabled: true, requiresKey: true,
}
```
