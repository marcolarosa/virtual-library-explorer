# Source Results iframe View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an iframe sidebar for viewing source content, display URLs as clickable links in result items, and replace import/export buttons with a collection view button.

**Architecture:** The iframe panel mirrors the existing detail-panel structure (left-side absolute positioning, -translate-x-full for hidden state). State tracks the current iframe URL. Result item rendering is enhanced to show a URL link and handle clicks to open the iframe. The collection button moves from a dedicated toggle to a shared functionality alongside the existing collection drawer.

**Tech Stack:** Vanilla JS, Tailwind CSS, iframe elements

---

## File Structure

- **index.html**: Update search bar HTML (replace import/export buttons), add iframe panel HTML
- **src/ui.js**: Add iframe state variable, create show/hide functions, update _renderSourceList, modify setupImportExport and setupCollectionDrawer

---

## Implementation Tasks

### Task 1: Update Search Bar HTML — Replace import/export with collection button

**Files:**
- Modify: `index.html:66-79`

- [ ] **Step 1: Replace the import and export buttons with a single collection button**

In `index.html`, find the search bar section (around line 66-79) and replace the two buttons:

```html
<!-- REMOVE these two buttons: -->
<button
    id="import-btn"
    class="bg-transparent border border-border text-text rounded-[20px] py-1 px-2 cursor-pointer text-[14px] transition-colors duration-200 hover:bg-border"
    title="Load graph"
>
    ↑
</button>
<button
    id="export-btn"
    class="bg-transparent border border-border text-text rounded-[20px] py-1 px-2 cursor-pointer text-[14px] transition-colors duration-200 hover:bg-border"
    title="Export collection"
>
    ↓
</button>

<!-- REPLACE with this single button: -->
<button
    id="collection-view-btn"
    class="bg-transparent border border-border text-text rounded-[20px] py-1 px-2 cursor-pointer text-[14px] transition-colors duration-200 hover:bg-border"
    title="Toggle collection"
>
    ≡
</button>
```

The final order in search bar should be:
1. collection-toggle (existing ⊞)
2. search-input
3. search-btn
4. collection-view-btn (new ≡)

- [ ] **Step 2: Verify HTML is valid**

Open `index.html` in a text editor and confirm:
- The search bar has exactly 4 elements in this order: collection-toggle, search-input, search-btn, collection-view-btn
- The collection-view-btn has the correct ID and class
- No syntax errors in the button HTML

---

### Task 2: Add iframe Panel HTML

**Files:**
- Modify: `index.html:137` (after detail-panel closing tag)

- [ ] **Step 1: Insert the iframe panel HTML after the detail-panel**

After the closing `</aside>` tag of `#detail-panel` (around line 137), insert:

```html
<aside
  id="iframe-panel"
  class="absolute top-0 bottom-0 w-panel bg-surface border border-border border-r-0 rounded-r-md flex flex-col transition-transform duration-200 ease-in-out z-[200] left-0 -translate-x-full"
>
  <div class="flex items-center justify-between px-3 py-2.5 border-b border-border shrink-0">
    <span id="iframe-title" class="text-sm font-semibold text-text flex-1 truncate"></span>
    <button
      id="iframe-close"
      class="bg-transparent border-none text-dim cursor-pointer text-xl leading-none hover:text-bright"
    >
      ×
    </button>
  </div>
  <iframe
    id="iframe-viewer"
    class="flex-1 border-0 w-full"
    allow="autoplay"
    title="Source content viewer"
  ></iframe>
</aside>
```

The panel should be positioned at the same z-index (200) as detail-panel and use the same width and styling.

- [ ] **Step 2: Verify the panel HTML**

Check that:
- The panel ID is `iframe-panel`
- The title element ID is `iframe-title`
- The close button ID is `iframe-close`
- The iframe element ID is `iframe-viewer`
- All CSS classes match the detail-panel structure (panel width, colors, transitions)

---

### Task 3: Add iframe State Variable to ui.js

**Files:**
- Modify: `src/ui.js:13-15`

- [ ] **Step 1: Add iframeUrl state variable**

After the `selectedNode` and `lastSourceId` declarations (around line 13-15), add:

```javascript
let iframeUrl = null; // current URL displayed in iframe panel
```

This tracks the currently loaded URL in the iframe, allowing us to prevent reloading the same URL twice.

- [ ] **Step 2: Verify the variable is declared**

Open `src/ui.js` and confirm:
- `iframeUrl` is declared at module level (same scope as `selectedNode`)
- It's initialized to `null`
- It comes after the existing state variables

---

### Task 4: Add iframe Show/Hide Functions

**Files:**
- Modify: `src/ui.js` (add after line 15, before setupSearch)

- [ ] **Step 1: Add showIframePanel function**

Insert these functions after the state variable declarations (before `setupSearch` function):

```javascript
function showIframePanel(url) {
  if (!url || url === "#") return;
  iframeUrl = url;
  const panel = $("iframe-panel");
  const title = $("iframe-title");
  const viewer = $("iframe-viewer");
  
  title.textContent = new URL(url).hostname;
  viewer.src = url;
  panel.classList.remove("-translate-x-full");
}

function hideIframePanel() {
  $("iframe-panel").classList.add("-translate-x-full");
  iframeUrl = null;
  $("iframe-viewer").src = "";
}
```

The `showIframePanel` function:
- Validates the URL (not empty, not "#")
- Stores it in `iframeUrl`
- Sets the panel title to the hostname (using `new URL(url).hostname`)
- Loads the URL into the iframe
- Removes the `-translate-x-full` class to slide the panel in

The `hideIframePanel` function:
- Adds the `-translate-x-full` class to slide the panel out
- Clears the stored URL
- Clears the iframe src

- [ ] **Step 2: Verify functions are correctly placed**

Check that:
- Both functions are defined before `setupSearch`
- They use the `$()` helper consistently
- The URL hostname extraction uses `new URL(url).hostname`
- The CSS class toggle uses the exact string `-translate-x-full`

---

### Task 5: Add setupIframePanel Function and Wire into initUI

**Files:**
- Modify: `src/ui.js:28` (initUI function), add new function before setupSearch

- [ ] **Step 1: Add setupIframePanel function**

Add this function right before `setupSearch` (around line 29):

```javascript
function setupIframePanel() {
  $("iframe-close").addEventListener("click", hideIframePanel);
}
```

- [ ] **Step 2: Call setupIframePanel in initUI**

Find the `initUI()` function (around line 19) and add the call to `setupIframePanel()` before `setupBusListeners()`:

```javascript
export function initUI() {
    setupSearch();
    setupSourcePanel();
    setupCollectionDrawer();
    setupDetailPanel();
    setupIframePanel();  // Add this line
    setupImportExport();
    setupBusListeners();
}
```

- [ ] **Step 3: Verify the wiring**

Check that:
- `setupIframePanel` is called in `initUI` (between setupDetailPanel and setupImportExport)
- The function wires the `iframe-close` button to call `hideIframePanel`

---

### Task 6: Refactor _renderSourceList to Add URL Links and iframe Click Handling

**Files:**
- Modify: `src/ui.js:248-274`

- [ ] **Step 1: Replace the entire _renderSourceList function**

Replace the current `_renderSourceList` function (lines 248-274) with:

```javascript
function _renderSourceList(sourceId) {
    const nodes = _getNodesForSource(sourceId);
    const content = $("detail-content");

    if (nodes.length === 0) {
        content.innerHTML =
            '<p class="text-dim text-xs text-center py-8 leading-[1.8]">No results yet.<br>Run a search to populate this source.</p>';
        return;
    }

    content.innerHTML = "";
    for (const node of nodes) {
        const item = document.createElement("div");
        item.className =
            "flex flex-col py-2 px-1 border-b border-border rounded-[4px] hover:bg-surface2";
        
        const resultBody = document.createElement("div");
        resultBody.className = "flex items-start gap-2 cursor-pointer";
        resultBody.innerHTML = `
      ${node.thumbnailUrl ? `<img src="${node.thumbnailUrl}" class="w-12 h-10 object-cover rounded-[3px] shrink-0 mt-0.5" onerror="this.style.display='none'">` : ""}
      <div class="flex-1 min-w-0">
        <div class="text-xs text-bright font-medium leading-[1.3] mb-0.5 overflow-hidden" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${node.title || "Untitled"}</div>
        ${node.date ? `<div class="text-[10px] text-dim">${node.date}</div>` : ""}
        <div class="text-[10px] text-dim font-mono uppercase mt-0.5">${node.type || ""}</div>
      </div>
    `;
        
        // Add URL link at bottom if URL exists
        if (node.result?.url && node.result.url !== "#") {
            const urlLink = document.createElement("a");
            urlLink.href = node.result.url;
            urlLink.target = "_blank";
            urlLink.rel = "noopener";
            urlLink.className = "text-[10px] text-accent no-underline hover:underline mt-1 inline-block";
            urlLink.textContent = "View source ↗";
            urlLink.addEventListener("click", (e) => {
                e.stopPropagation(); // Prevent result body click handler
            });
            item.appendChild(resultBody);
            item.appendChild(urlLink);
        } else {
            item.appendChild(resultBody);
        }
        
        // Click result body to open iframe
        resultBody.addEventListener("click", () => {
            if (node.result?.url) showIframePanel(node.result.url);
        });
        
        content.appendChild(item);
    }
}
```

Key changes:
- Split the item into two parts: `resultBody` (the clickable content) and `urlLink` (the external link)
- The `resultBody` is wrapped in a flex container and has `cursor-pointer` class
- The `urlLink` is conditionally created if URL exists
- The URL link has `stopPropagation()` to prevent triggering the result body click
- Clicking the result body calls `showIframePanel(url)` instead of `showDetailPanel()`

- [ ] **Step 2: Verify the refactored function**

Check that:
- The structure creates two separate elements (resultBody and urlLink)
- The URL link opens in a new tab (`target="_blank"`)
- The URL link has security attributes (`rel="noopener"`)
- The `stopPropagation()` prevents the link click from triggering the result body handler
- The result body click calls `showIframePanel()` not `showDetailPanel()`

---

### Task 7: Update setupImportExport Function

**Files:**
- Modify: `src/ui.js:428-446`

- [ ] **Step 1: Update setupImportExport function**

Replace the `setupImportExport` function with:

```javascript
function setupImportExport() {
  // Keep import functionality in case needed via API, but remove UI buttons
  $("import-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        importGraph(data);
      } catch (err) {
        alert("Failed to load graph: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });
}
```

Changes:
- Remove the event listeners for `export-btn` and `import-btn` (those elements no longer exist)
- Keep only the file input change handler (for the hidden `#import-file` element)
- This allows importing via API or hidden input while removing the UI buttons

- [ ] **Step 2: Verify the function**

Check that:
- Only the `import-file` input handler remains
- No references to `export-btn` or `import-btn` exist
- The file reading and import logic is preserved

---

### Task 8: Update setupCollectionDrawer to Wire New Button

**Files:**
- Modify: `src/ui.js:155-159`

- [ ] **Step 1: Add collection-view-btn handler to setupCollectionDrawer**

Update the `setupCollectionDrawer` function to add a handler for the new button:

```javascript
function setupCollectionDrawer() {
    $("collection-toggle").addEventListener("click", () => toggleDrawer("collection-drawer"));
    $("collection-view-btn").addEventListener("click", () => toggleDrawer("collection-drawer"));  // NEW
    $("collection-close").addEventListener("click", () => closeDrawer("collection-drawer"));
    $("export-btn-2").addEventListener("click", exportCollection);
}
```

The new button:
- Has the same click handler as `collection-toggle` (both toggle the drawer)
- This provides redundant access to the collection view from the search bar

- [ ] **Step 2: Verify the wiring**

Check that:
- The `collection-view-btn` calls `toggleDrawer("collection-drawer")`
- Both the existing toggle and new button wire to the same function
- The export button handler (`export-btn-2`) is unchanged

---

### Task 9: Manual Testing — All Features

**Test environment:** Running on `http://localhost:8080`

- [ ] **Step 1: Verify search bar layout**

- Open the app and look at the search bar
- Confirm it has 4 buttons in order: ⊞ (collection toggle), search input, Search button, ≡ (collection view)
- Hover over the ≡ button and verify the title says "Toggle collection"
- No console errors

- [ ] **Step 2: Test collection button functionality**

- Click the ≡ button in the search bar
- Verify the collection drawer opens from the left
- Click ≡ again (or the × on the drawer)
- Verify the drawer closes
- Click the original ⊞ button
- Verify the drawer opens again (both buttons work)

- [ ] **Step 3: Test source results rendering**

- Search for something (e.g., "portrait")
- Click a source in the Sources panel to view results
- Verify each result shows:
  - Thumbnail (if available)
  - Title
  - Date (if available)
  - Type
  - URL link at the bottom saying "View source ↗"
- Hover over the URL link and verify it has an underline on hover
- No results should appear empty

- [ ] **Step 4: Test URL link external behavior**

- Right-click a "View source ↗" link
- Verify context menu shows "Open in new tab" (standard link behavior)
- Option-click (or equivalent for your OS) to open in new tab
- Verify it opens the correct URL in a new browser tab
- Verify `rel="noopener"` security is applied (check in DevTools Network)

- [ ] **Step 5: Test iframe panel opening**

- From a source results list, click on a result item (anywhere except the URL link)
- Verify the iframe panel slides in from the left side
- Verify the panel title shows the hostname of the source URL (e.g., "trove.nla.gov.au")
- Verify the iframe displays the source content
- Verify the panel has a × close button in the top right

- [ ] **Step 6: Test iframe panel closing**

- With the iframe panel open, click the × button
- Verify the panel slides out to the left and hides
- Verify the iframe src is cleared in DevTools

- [ ] **Step 7: Test switching between results**

- With the iframe panel open, click a different result item
- Verify the iframe updates to show the new URL
- Verify the panel title updates to the new hostname
- No console errors or broken iframes

- [ ] **Step 8: Test coexistence of panels**

- Open the collection drawer (using ≡ or ⊞ button)
- From the source sidebar, click a result to open the iframe panel
- Verify both panels are visible at the same time
- Close the collection drawer using its × button
- Verify the iframe panel remains open
- Close the iframe panel using its × button
- Verify the collection drawer is still open (if it was before)

- [ ] **Step 9: Test edge cases**

- Click a result without a URL (if any exist)
- Verify no URL link appears
- Verify clicking it does nothing (no error)
- Search for something new while the iframe is open
- Verify the graph resets and the iframe panel closes (expected behavior)

- [ ] **Step 10: Browser console check**

- Open DevTools console (F12)
- Perform all above steps
- Verify no errors appear in the console
- No warnings about CSS, missing functions, or iframe issues

---

## Spec Coverage Checklist

- ✓ Display URLs in source result items as clickable links (Task 6)
- ✓ Add left sidebar with iframe to view source content (Task 2)
- ✓ Opens when clicking result (Task 6)
- ✓ Replace import/export buttons with collection button (Task 1)
- ✓ Both sidebars can coexist independently (Task 8, verified in testing)
- ✓ Sidebar closes independently via × button (Task 5)
- ✓ Clicking different result swaps iframe URL (Task 6)
- ✓ URL link opens in new tab (Task 6)
- ✓ Smooth transitions and styling (HTML structure follows existing patterns)

---

## Notes for Implementation

- The iframe will show a blank/error state for CORS-blocked sites — this is expected per spec
- No special error handling needed for missing URLs or invalid URLs
- The panel uses Tailwind's existing CSS custom properties for colors
- The design matches the existing detail-panel structure for consistency
