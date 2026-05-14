---
name: Source Results iframe View
description: Add URL links to source results, iframe sidebar for viewing source content, replace import/export buttons with collection button
type: design
---

# Source Results iframe View Design

## Overview

Enhance the UI to make source content more accessible:
1. Display URLs in source result items as clickable links
2. Add left sidebar with iframe to view source content (opens when clicking result)
3. Replace import/export buttons in search bar with a collection view button
4. Both sidebars (iframe + detail panel) can coexist independently

## User Experience Flow

**Viewing source results:**
- User clicks a result item (anywhere except the URL) → iframe sidebar opens on left, loads that source URL
- User clicks the URL link specifically → opens in new tab (standard behavior)
- Both sidebars can be open simultaneously: detail panel (right) shows node info, iframe panel (left) shows source content

**Collection access:**
- User clicks collection button in search bar → toggles collection drawer (existing behavior, just moved button)

**Navigation:**
- Each sidebar closes independently via its × button
- Clicking a different result swaps the iframe URL
- Clicking a result while viewing another result updates the iframe

## HTML Changes

### Search Bar (index.html)

Replace import/export buttons:
```html
<!-- Remove these: -->
<button id="import-btn" ...>↑</button>
<button id="export-btn" ...>↓</button>

<!-- Add this: -->
<button
  id="collection-view-btn"
  class="bg-transparent border border-border text-text rounded-[20px] py-1 px-2 cursor-pointer text-[14px] transition-colors duration-200 hover:bg-border"
  title="Toggle collection"
>
  ≡
</button>
```

### New iframe Panel (index.html)

Insert after `#detail-panel`:
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

## JavaScript Changes (src/ui.js)

### New State Variables

Add to module level (near `selectedNode`):
```javascript
let iframeUrl = null; // current URL in iframe panel
```

### New Functions

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

### Setup Function for iframe Panel

```javascript
function setupIframePanel() {
  $("iframe-close").addEventListener("click", hideIframePanel);
}
```

Call this in `initUI()`:
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

### Modify `_renderSourceList()`

Update the result item rendering to:
1. Add URL link at bottom
2. Wire clicks to open iframe (prevent default for link clicks)

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
        
        // Add URL link at bottom
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

### Modify `setupImportExport()`

Remove button handlers and file input setup (or simplify):
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

### Add Collection Button Handler

In `setupCollectionDrawer()`, add:
```javascript
function setupCollectionDrawer() {
    $("collection-toggle").addEventListener("click", () => toggleDrawer("collection-drawer"));
    $("collection-view-btn").addEventListener("click", () => toggleDrawer("collection-drawer")); // NEW
    $("collection-close").addEventListener("click", () => closeDrawer("collection-drawer"));
    $("export-btn-2").addEventListener("click", exportCollection);
}
```

## Data Flow

1. **Source sidebar result click** → `_renderSourceList` click handler
   - If URL exists: calls `showIframePanel(url)`
   - Iframe panel opens on left, loads URL
2. **URL link click** → browser default behavior (`target="_blank"`)
   - Stops propagation to prevent result click handler
3. **Collection button click** → `toggleDrawer("collection-drawer")`
4. **iframe close click** → `hideIframePanel()` removes panel and clears URL

## Styling

- iframe panel uses existing panel classes (same as detail-panel)
- Transition classes handle smooth slide-in/out
- Z-index matches detail-panel (200)
- Uses CSS custom properties for colors (dark theme)

## Browser Compatibility

- iframe elements: all modern browsers
- `allow="autoplay"` attribute: enables media playback if source supports it
- `rel="noopener"` on links: security best practice for `target="_blank"`

## Edge Cases

1. **CORS issues:** Some sites block iframe embedding. No explicit handling — iframe will show blank/error state. This is expected behavior and user can always click the link to view in new tab.
2. **Missing URL:** Results without URLs show no link, clicking result does nothing.
3. **Same URL twice:** Clicking different results with same URL re-loads iframe (no caching).
4. **Fast switching:** Clicking results rapidly updates iframe src — no queuing, last click wins.

## Testing Checklist

- [ ] URL links appear at bottom of each result
- [ ] Clicking URL link opens in new tab
- [ ] Clicking result body opens iframe panel on left
- [ ] iframe panel closes independently
- [ ] Clicking different results updates iframe
- [ ] Collection button toggles drawer
- [ ] No console errors
- [ ] Styling matches dark theme
- [ ] Panel transitions are smooth
