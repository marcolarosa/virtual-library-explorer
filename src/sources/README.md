# Adding New Library Sources

Sources are organized by region. Each source is a JS module that exports metadata and handler functions.

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

2. **Export a source object** with this structure:
```javascript
async function <libraryNameCamelCase>SearchFn({ query, limit = 10, testing = false }) {
    // implementation: return { docs: [...], total: N }
}

async function nextPageFn(url) {
    // stub: implement pagination if needed
}

async function scrapeFn(url) {
    // stub: implement scraping if needed
}

export const source = {
    metadata: {
        id: "unique-short-id",
        label: "Full Library Name",
        country: "Country Name", // full country name
        region: "Africa|Asia|Americas|Europe|Oceania",
        enabled: true,
        lat: 0.0,
        lng: 0.0,
    },
    searchFn: <libraryNameCamelCase>SearchFn,
    nextPageFn,
    scrapeFn,
};
```

3. **Search function return object**:
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

## Auto-Discovery

Source files are auto-discovered via `import.meta.glob()` in `src/sources.js`. Simply create a new file in the appropriate region folder and it will be automatically registered — no manual entry needed in `sources.js`.

Also add a region color to `REGION_COLORS` if introducing a new region.

## Notes

- **IDs** must be unique and consistent. Use format: `<sourceId>::<record-id>`
- **Testing mode** — some sources check the `testing` flag to return mock data instead of hitting the API
- **CORS** — problematic APIs use `fetchWithCorsFallback()` to route through a proxy
- **API keys** — stored in localStorage as `apiKey:<sourceId>`. Keyed sources silently return `[]` if no key is set
