# Adding New Library Sources

Sources are organized by region. Each source is a JS module that exports a search function.

## Directory Structure

```
sources/
├── americas/
│   ├── library-of-congress.js
│   └── digital-public-library-of-america.js
├── europe/
│   ├── europeana.js
│   └── rijksmuseum.js
├── oceania/
│   ├── trove.js
│   └── state-library-of-victoria.js
├── africa/
└── asia/
```

## Creating a New Source

1. **Create a file** in the appropriate region folder: `src/sources/<region>/<library-name>.js`

2. **Export a search function** with this signature:
```javascript
export async function <libraryNameCamelCase>SearchFn({ query, limit = 10, testing = false }) {
    // implementation
}
```

3. **Return an object** with this structure:
```javascript
{
    docs: [
        {
            id: "<sourceId>::<unique-record-id>",
            title: "string",
            type: "work",
            description: "string",
            date: "string",
            url: "string (full URL)",
            thumbnailUrl: "string (full URL or empty)",
            sourceId: "<sourceId>",
            subjects: ["array", "of", "strings"],
            creators: ["array", "of", "strings"]
        }
    ],
    total: 123 // total results available from API
}
```

## Utilities

Use utilities from `src/utils.js`:

- **`search()`** — For APIs that return JSON. Handles CORS, pagination, field mapping.
- **`cachedFetch()`** — Caches results to avoid repeated API calls.
- **`fetchHtmlAndExtract()`** — For scraping HTML when no JSON API exists. Uses CSS selectors to extract data.
- **`fetchWithCorsFallback()`** — Tries direct fetch, then allorigins.win, then corsproxy.io.

## Registering the Source

Add an entry to `src/sources.js` in the `SOURCES` array:

```javascript
{
    id: "unique-short-id",
    label: "Full Library Name",
    shortLabel: "Short",
    country: "XX", // ISO 2-letter code
    region: "Africa|Asia|Americas|Europe|Oceania",
    searchFn: yourSearchFn,
    enabled: true|false,
    lat: 0.0,
    lng: 0.0,
}
```

Also add a region color to `REGION_COLORS` if introducing a new region.

## Notes

- **IDs** must be unique and consistent. Use format: `<sourceId>::<record-id>`
- **Testing mode** — some sources check the `testing` flag to return mock data instead of hitting the API
- **CORS** — problematic APIs use `fetchWithCorsFallback()` to route through a proxy
- **API keys** — stored in localStorage as `apiKey:<sourceId>`. Keyed sources silently return `[]` if no key is set
