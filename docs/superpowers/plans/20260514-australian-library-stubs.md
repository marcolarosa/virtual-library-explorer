# Australian Library Stubs Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add five Australian library source stubs to the library explorer's Oceania region.

**Architecture:** Create five new stub source files in `src/sources/oceania/`, each exporting a search function that returns empty results. Wire them into `src/sources.js` with accurate geographic coordinates for each library location.

**Tech Stack:** Vanilla JavaScript ES modules

---

## File Structure

**New files to create:**
- `src/sources/oceania/state-library-new-south-wales.js`
- `src/sources/oceania/national-library-australia.js` (replacing existing stub)
- `src/sources/oceania/state-library-queensland.js`
- `src/sources/oceania/state-library-south-australia.js`
- `src/sources/oceania/state-library-western-australia.js`

**Files to modify:**
- `src/sources.js` — add imports and registry entries

---

### Task 1: Create State Library of New South Wales stub

**Files:**
- Create: `src/sources/oceania/state-library-new-south-wales.js`

- [ ] **Step 1: Create the stub file**

```javascript
export async function slnswSearchFn({ query, limit = 10, testing = false }) {
    return { docs: [], total: 0 };
}
```

- [ ] **Step 2: Verify file exists**

Run: `ls -la src/sources/oceania/state-library-new-south-wales.js`

Expected: File listed in directory

---

### Task 2: Create National Library of Australia stub

**Files:**
- Create/Replace: `src/sources/oceania/national-library-australia.js`

- [ ] **Step 1: Write the stub file**

```javascript
export async function nlaSearchFn({ query, limit = 10, testing = false }) {
    return { docs: [], total: 0 };
}
```

- [ ] **Step 2: Verify file exists**

Run: `ls -la src/sources/oceania/national-library-australia.js`

Expected: File listed in directory

---

### Task 3: Create State Library of Queensland stub

**Files:**
- Create: `src/sources/oceania/state-library-queensland.js`

- [ ] **Step 1: Create the stub file**

```javascript
export async function slqSearchFn({ query, limit = 10, testing = false }) {
    return { docs: [], total: 0 };
}
```

- [ ] **Step 2: Verify file exists**

Run: `ls -la src/sources/oceania/state-library-queensland.js`

Expected: File listed in directory

---

### Task 4: Create State Library of South Australia stub

**Files:**
- Create: `src/sources/oceania/state-library-south-australia.js`

- [ ] **Step 1: Create the stub file**

```javascript
export async function slsaSearchFn({ query, limit = 10, testing = false }) {
    return { docs: [], total: 0 };
}
```

- [ ] **Step 2: Verify file exists**

Run: `ls -la src/sources/oceania/state-library-south-australia.js`

Expected: File listed in directory

---

### Task 5: Create State Library of Western Australia stub

**Files:**
- Create: `src/sources/oceania/state-library-western-australia.js`

- [ ] **Step 1: Create the stub file**

```javascript
export async function slwaSearchFn({ query, limit = 10, testing = false }) {
    return { docs: [], total: 0 };
}
```

- [ ] **Step 2: Verify file exists**

Run: `ls -la src/sources/oceania/state-library-western-australia.js`

Expected: File listed in directory

---

### Task 6: Add imports to src/sources.js

**Files:**
- Modify: `src/sources.js` (lines 1-25)

- [ ] **Step 1: Add import statements**

Add these five lines after the existing oceania imports (after line 13):

```javascript
import { slnswSearchFn } from "./sources/oceania/state-library-new-south-wales.js";
import { slqSearchFn } from "./sources/oceania/state-library-queensland.js";
import { slsaSearchFn } from "./sources/oceania/state-library-south-australia.js";
import { slwaSearchFn } from "./sources/oceania/state-library-western-australia.js";
```

Note: The `nlaSearchFn` import already exists on line 14, so don't add a duplicate.

- [ ] **Step 2: Verify imports are correct**

Run: `grep -n "slnswSearchFn\|slqSearchFn\|slsaSearchFn\|slwaSearchFn" src/sources.js`

Expected: Four lines showing the new imports

---

### Task 7: Register sources in SOURCES array

**Files:**
- Modify: `src/sources.js` (SOURCES array, after existing Oceania entries)

- [ ] **Step 1: Add SLNSW to SOURCES**

Find the Trove entry and add this after it (around line 62):

```javascript
    {
        id: "slnsw",
        label: "State Library of New South Wales",
        shortLabel: "SLNSW",
        country: "AU",
        region: "Oceania",
        searchFn: slnswSearchFn,
        enabled: true,
        lat: -33.866867,
        lng: 151.212845,
    },
```

- [ ] **Step 2: Add NLA to SOURCES**

Find the existing NLA entry (around line 191) and replace it with:

```javascript
    {
        id: "nla",
        label: "National Library of Australia",
        shortLabel: "NLA",
        country: "AU",
        region: "Oceania",
        searchFn: nlaSearchFn,
        enabled: true,
        lat: -35.296623,
        lng: 149.129822,
    },
```

- [ ] **Step 3: Add SLQ to SOURCES**

Add after the NLA entry:

```javascript
    {
        id: "slq",
        label: "State Library of Queensland",
        shortLabel: "SLQ",
        country: "AU",
        region: "Oceania",
        searchFn: slqSearchFn,
        enabled: true,
        lat: -27.4712,
        lng: 153.0181,
    },
```

- [ ] **Step 4: Add SLSA to SOURCES**

Add after the SLQ entry:

```javascript
    {
        id: "slsa",
        label: "State Library of South Australia",
        shortLabel: "SLSA",
        country: "AU",
        region: "Oceania",
        searchFn: slsaSearchFn,
        enabled: true,
        lat: -34.9209,
        lng: 138.6022,
    },
```

- [ ] **Step 5: Add SLWA to SOURCES**

Add after the SLSA entry:

```javascript
    {
        id: "slwa",
        label: "State Library of Western Australia",
        shortLabel: "SLWA",
        country: "AU",
        region: "Oceania",
        searchFn: slwaSearchFn,
        enabled: true,
        lat: -31.9490,
        lng: 115.8605,
    },
```

- [ ] **Step 6: Verify SOURCES entries are valid JSON**

Run: `node -e "import('./src/sources.js').catch(e => console.error(e))"`

Expected: No syntax errors

---

### Task 8: Verify all five sources load correctly

**Files:**
- Test: `src/sources.js`

- [ ] **Step 1: Check sources.js syntax**

Run: `node --check src/sources.js`

Expected: Syntax OK (no output)

- [ ] **Step 2: Count Oceania sources**

Run: `grep -c "region: \"Oceania\"" src/sources.js`

Expected: Should show at least 7 (Trove, SLNSW, SLNZ, NLA, SLQ, SLSA, SLWA)

---

### Task 9: Commit changes

**Files:**
- All created/modified files from Tasks 1-7

- [ ] **Step 1: Stage all files**

Run:
```bash
git add src/sources/oceania/state-library-new-south-wales.js
git add src/sources/oceania/national-library-australia.js
git add src/sources/oceania/state-library-queensland.js
git add src/sources/oceania/state-library-south-australia.js
git add src/sources/oceania/state-library-western-australia.js
git add src/sources.js
```

- [ ] **Step 2: Verify staged files**

Run: `git status`

Expected: All six files shown as "new file" or "modified"

- [ ] **Step 3: Commit**

Run:
```bash
git commit -m "feat: add five Australian library stubs

- State Library of New South Wales (SLNSW)
- National Library of Australia (NLA, updated from stub)
- State Library of Queensland (SLQ)
- State Library of South Australia (SLSA)
- State Library of Western Australia (SLWA)

All return empty results pending API integration."
```

Expected: Commit succeeds with 6 files changed

---

## Sources

- [State Library of NSW Coordinates](https://www.latlong.net/place/state-library-of-new-south-wales-sydney-australia-22319.html)
- [National Library of Australia Coordinates](https://www.latlong.net/place/national-library-of-australia-canberra-australia-22175.html)
- [State Library of Queensland Coordinates](https://www.yelp.com/biz/state-library-of-queensland-south-brisbane)
- [State Library of South Australia Coordinates](https://latitude.to/articles-by-country/au/australia/27105/state-library-of-south-australia)
- [State Library of Western Australia Coordinates](https://latitude.to/articles-by-country/au/australia/29742/state-library-of-western-australia)
