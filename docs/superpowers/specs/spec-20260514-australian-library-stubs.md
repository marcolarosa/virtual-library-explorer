# Australian Library Stubs - Design Spec

## Overview
Add five Australian library source stubs to the library explorer's Oceania region. These are placeholder implementations that can be filled with real API integrations later.

## Sources to Add

| Library | ID | Address | Coordinates |
|---------|----|----|-------------|
| State Library of New South Wales | `slnsw` | 1 Shakespeare Place, Sydney NSW 2000 | -33.866867, 151.212845 |
| National Library of Australia | `nla` | Parkes Pl W, Canberra | -35.296623, 149.129822 |
| State Library of Queensland | `slq` | Stanley Place, South Brisbane QLD 4101 | -27.4712, 153.0181 |
| State Library of South Australia | `slsa` | North Terrace, Adelaide SA 5000 | -34.9209, 138.6022 |
| State Library of Western Australia | `slwa` | 25 Francis Street, Perth WA 6000 | -31.9490, 115.8605 |

## Implementation Details

### Files to Create
Create five new files in `src/sources/oceania/`:
- `state-library-new-south-wales.js`
- `national-library-australia.js` (update existing stub)
- `state-library-queensland.js`
- `state-library-south-australia.js`
- `state-library-western-australia.js`

Each file exports a search function with the signature:
```javascript
export async function <libraryName>SearchFn({ query, limit = 10, testing = false }) {
    return { docs: [], total: 0 };
}
```

### Registration in sources.js
Add five import statements at the top for each search function, then add five entries to the `SOURCES` array with:
- Unique `id` (as listed above)
- Descriptive `label` (e.g., "State Library of New South Wales")
- Brief `shortLabel` (e.g., "SLNSW")
- `country: "AU"`
- `region: "Oceania"`
- Appropriate `lat` and `lng` coordinates
- `enabled: true`

## Testing
Stubs will appear in the UI but return no results. This allows the UI/graph structure to work correctly while leaving API integration for future work.
