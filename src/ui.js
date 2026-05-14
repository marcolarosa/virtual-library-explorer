import { state } from "./state.js";
import { on } from "./bus.js";
import { SOURCES, getRegionColor } from "./sources.js";
import { pinNode, unpinNode, setAnnotation, exportCollection, importGraph } from "./collection.js";
import { runSearch, expandNode, getNodeDepth } from "./search.js";
import { zoomToFit, refreshMap, focusSource } from "./mapview.js";
import { debounce, truncate } from "./utils.js";

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

let selectedNode = null;
let lastSourceId = null; // tracks source for back-button navigation
let panelMode = null; // 'source' | 'node'
let iframeUrl = null; // current URL displayed in iframe panel

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initUI() {
    setupSearch();
    // setupControls();
    setupSourcePanel();
    setupCollectionDrawer();
    setupDetailPanel();
    setupIframePanel();
    setupImportExport();
    setupBusListeners();
}

// ─── iframe panel ────────────────────────────────────────────────────────────

function showIframePanel(url) {
  if (!url || url === "#") return;
  closeDrawer("collection-drawer");
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

function setupIframePanel() {
  $("iframe-close").addEventListener("click", hideIframePanel);
}

// ─── Search ───────────────────────────────────────────────────────────────────

function setupSearch() {
    const input = $("search-input");
    const btn = $("search-btn");

    const doSearch = debounce(() => {
        const q = input.value.trim();
        if (q) runSearch(q);
    }, 400);

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            doSearch();
        }
    });
    btn.addEventListener("click", doSearch);
}

// ─── Controls ─────────────────────────────────────────────────────────────────

// function setupControls() {
//     $("zoom-fit").addEventListener("click", zoomToFit);

//     $("toggle-labels").addEventListener("click", () => {
//         state.labelsVisible = !state.labelsVisible;
//         const btn = $("toggle-labels");
//         btn.classList.toggle("text-accent", state.labelsVisible);
//         btn.classList.toggle("border-accent", state.labelsVisible);
//         btn.classList.toggle("text-dim", !state.labelsVisible);
//         btn.classList.toggle("border-border", !state.labelsVisible);
//         refreshMap();
//     });

//     $("reset-graph").addEventListener("click", () => {
//         if (!confirm("Reset the graph? Your collection is preserved.")) return;
//         const { resetGraph, clearMap } = window.__appModules;
//         resetGraph();
//         clearMap();
//         updateStatusBar();
//         hideDetailPanel();
//         updateNodeCapWarning();
//     });

//     setupFilters();
// }

// function setupFilters() {
//     const filterContainer = $("filter-sources");
//     const typeContainer = $("filter-types");

//     // Source filters
//     filterContainer.innerHTML = "";
//     for (const src of SOURCES) {
//         const label = document.createElement("label");
//         label.className =
//             "flex items-center gap-1 py-[3px] px-2 rounded-[10px] bg-surface border border-border text-dim text-[11px] cursor-pointer hover:bg-surface2";
//         label.style.borderLeft = `3px solid ${getRegionColor(src.region)}`;
//         label.innerHTML = `<input type="checkbox" class="accent-accent" checked data-source="${src.id}"> ${src.label}`;
//         label.querySelector("input").addEventListener("change", (e) => {
//             if (e.target.checked) state.filters.hiddenSources.delete(src.id);
//             else state.filters.hiddenSources.add(src.id);
//             refreshMap();
//         });
//         filterContainer.appendChild(label);
//     }

//     // Type filters
//     const types = ["work", "person", "subject", "place", "organisation"];
//     typeContainer.innerHTML = "";
//     for (const type of types) {
//         const label = document.createElement("label");
//         label.className =
//             "flex items-center gap-1 py-[3px] px-2 rounded-[10px] bg-surface border border-border text-dim text-[11px] cursor-pointer hover:bg-surface2";
//         label.innerHTML = `<input type="checkbox" class="accent-accent" checked data-type="${type}"> ${type}`;
//         label.querySelector("input").addEventListener("change", (e) => {
//             if (e.target.checked) state.filters.hiddenTypes.delete(type);
//             else state.filters.hiddenTypes.add(type);
//             refreshMap();
//         });
//         typeContainer.appendChild(label);
//     }
// }

// ─── Source panel ─────────────────────────────────────────────────────────────

function setupSourcePanel() {
    $("source-panel-toggle").addEventListener("click", () => {
        const list = $("source-list");
        const isCollapsed = list.style.display === "none";
        list.style.display = isCollapsed ? "" : "none";
        $("source-panel-toggle").textContent = isCollapsed ? "−" : "+";
    });
    renderSourcePanel();
}

export function renderSourcePanel() {
    const list = $("source-list");
    list.innerHTML = "";
    for (const src of SOURCES) {
        const status = state.sourceStatuses.get(src.id) || { status: "idle" };
        const row = document.createElement("div");
        row.className = "flex items-center gap-1.5 px-3 py-1 text-xs cursor-pointer";
        row.dataset.sourceId = src.id;

        const statusText =
            {
                idle: "idle",
                querying: '<span class="blink">querying…</span>',
                done: `${status.count} results${status.latency ? " · " + status.latency + "ms" : ""}`,
                error: '<span class="text-[#ff6b6b]">error</span>',
            }[status.status] || "idle";

        row.innerHTML = `
      <span class="w-2 h-2 rounded-full shrink-0" style="background:${src.color}"></span>
      <span class="flex-1 text-text">${src.label}</span>
      <span class="text-[10px] text-text font-mono">${statusText}</span>
    `;
        row.addEventListener("click", () => focusSource(src.id));
        list.appendChild(row);
    }
}

// ─── Collection drawer ────────────────────────────────────────────────────────

function setupCollectionDrawer() {
    const openCollection = () => {
        hideIframePanel();
        toggleDrawer("collection-drawer");
    };
    $("collection-toggle").addEventListener("click", openCollection);
    $("collection-view-btn").addEventListener("click", openCollection);
    $("collection-close").addEventListener("click", () => closeDrawer("collection-drawer"));
    $("export-btn-2").addEventListener("click", exportCollection);
}

export function renderCollectionDrawer() {
    const list = $("collection-list");
    if (state.collection.size === 0) {
        list.innerHTML =
            '<p class="text-dim px-3.5 py-5 text-center leading-[1.6]">No items pinned yet.<br>Click a node and pin it.</p>';
        return;
    }

    // Group by source
    const bySource = new Map();
    for (const [nodeId, entry] of state.collection) {
        if (!bySource.has(entry.sourceId)) bySource.set(entry.sourceId, []);
        bySource.get(entry.sourceId).push([nodeId, entry]);
    }

    list.innerHTML = "";
    for (const [sourceId, items] of bySource) {
        const src = SOURCES.find((s) => s.id === sourceId);
        const group = document.createElement("div");
        group.className = "mb-2";
        group.innerHTML = `<div class="font-mono text-[10px] uppercase tracking-[1px] px-3.5 py-1.5 font-semibold" style="color:${src ? getRegionColor(src.region) : "#888"}">${src?.label || sourceId}</div>`;

        for (const [nodeId, entry] of items) {
            const item = document.createElement("div");
            item.className = "px-3.5 py-3 border-b border-border hover:bg-surface2";

            const metaRows = [
                entry.type       ? ["Type",        entry.type] : null,
                entry.description ? ["Description", entry.description] : null,
                (entry.rawCreators?.length) ? ["Creators", entry.rawCreators.join(", ")] : null,
                (entry.rawSubjects?.length) ? ["Subjects", entry.rawSubjects.join(", ")] : null,
                entry.url && entry.url !== "#" ? ["URL", `<a href="${entry.url}" target="_blank" rel="noopener" class="text-accent no-underline hover:underline">View original ↗</a>`] : null,
            ].filter(Boolean);

            const metaTable = metaRows.length ? `
        <table class="w-full text-[11px] mb-2 border-collapse">
          ${metaRows.map(([label, value]) => `
          <tr class="border-b border-border">
            <td class="py-1 pr-3 text-dim font-mono uppercase tracking-[0.5px] whitespace-nowrap align-top w-[80px]">${label}</td>
            <td class="py-1 text-text leading-[1.5] break-words">${value}</td>
          </tr>`).join("")}
        </table>` : "";

            item.innerHTML = `
        ${entry.thumbnailUrl ? `<img src="${entry.thumbnailUrl}" class="w-full max-h-[120px] object-cover rounded-[4px] mb-2" onerror="this.style.display='none'">` : ""}
        <div class="flex gap-1.5 flex-wrap mb-1.5">
          ${entry.type ? `<span class="text-[10px] py-0.5 px-1.5 rounded-[10px] font-mono uppercase tracking-[0.5px] bg-surface2 text-dim">${entry.type}</span>` : ""}
          <span class="text-[10px] py-0.5 px-1.5 rounded-[10px] font-mono uppercase tracking-[0.5px] text-black font-semibold" style="background:${src ? getRegionColor(src.region) : "#888"}">${src?.label || entry.sourceId}</span>
        </div>
        <div class="text-xs text-bright font-medium leading-[1.3] mb-1">${entry.label || "Untitled"}</div>
        ${entry.date ? `<div class="text-[10px] text-dim font-mono mb-2">${entry.date}</div>` : ""}
        ${metaTable}
        <textarea class="w-full bg-bg border border-border text-text rounded-[4px] px-1.5 py-1 text-[11px] font-sans resize-y mb-1.5" placeholder="Add note…" rows="2">${entry.annotation || ""}</textarea>
        <div class="flex gap-1.5">
          <button class="py-0.5 px-2 text-[11px] rounded-[4px] bg-surface2 border border-border text-[#ff6b6b] cursor-pointer hover:bg-[rgba(255,107,107,0.15)]" data-action="unpin" data-id="${nodeId}">Remove</button>
        </div>
      `;
            item.querySelector('[data-action="unpin"]').addEventListener("click", () => {
                unpinNode(nodeId);
                renderCollectionDrawer();
                if (selectedNode?.id === nodeId) renderDetailPanel(selectedNode);
                refreshMap();
            });
            item.querySelector("textarea").addEventListener("change", (e) => {
                setAnnotation(nodeId, e.target.value);
            });
            group.appendChild(item);
        }
        list.appendChild(group);
    }
}

// ─── Source sidebar helpers ───────────────────────────────────────────────────

function _getNodesForSource(sourceId) {
    return [...state.nodes.values()].filter(
        (n) => n.sourceId === sourceId && n.type !== "query" && n.type !== "source",
    );
}

function _setPanelHeader({ sourceId, showBack }) {
    const src = SOURCES.find((s) => s.id === sourceId);
    const dot = $("panel-source-dot");
    const title = $("panel-title");
    const back = $("panel-back-btn");

    if (src) {
        dot.style.background = src.color;
        dot.classList.remove("hidden");
        title.textContent = src.label || src.label || sourceId;
        title.style.color = src.color;
    } else {
        dot.classList.add("hidden");
        title.textContent = "";
        title.style.color = "";
    }

    back.classList.toggle("hidden", !showBack);
}

function showSourceSidebar(sourceId) {
    lastSourceId = sourceId;
    panelMode = "source";
    _setPanelHeader({ sourceId, showBack: false });
    _renderSourceList(sourceId);
    $("detail-panel").classList.remove("translate-x-full");
}

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

        item.appendChild(resultBody);

        // Click result body to open detail panel and iframe
        resultBody.addEventListener("click", () => {
            showDetailPanel(node, true);
        });

        if (node.url && node.url !== "#") {
            const actionRow = document.createElement("div");
            actionRow.className = "flex gap-1.5 mt-1.5";
            const btnCls = "py-0.5 px-2 text-[11px] rounded-[4px] bg-surface2 border border-border text-text cursor-pointer hover:bg-border no-underline";
            const openLink = document.createElement("a");
            openLink.href = node.url;
            openLink.target = "_blank";
            openLink.rel = "noopener";
            openLink.className = btnCls;
            openLink.textContent = "Open ↗";
            const iframeBtn = document.createElement("button");
            iframeBtn.className = btnCls;
            iframeBtn.textContent = "View in panel";
            iframeBtn.addEventListener("click", () => showIframePanel(node.url));
            actionRow.appendChild(openLink);
            actionRow.appendChild(iframeBtn);
            item.appendChild(actionRow);
        }

        content.appendChild(item);
    }
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function setupDetailPanel() {
    $("detail-close").addEventListener("click", hideDetailPanel);
    $("panel-back-btn").addEventListener("click", () => {
        if (lastSourceId) showSourceSidebar(lastSourceId);
    });
}

export function showDetailPanel(node, fromSource = false) {
    selectedNode = node;
    panelMode = "node";
    _setPanelHeader({ sourceId: node.sourceId, showBack: fromSource && !!lastSourceId });
    renderDetailPanel(node);
    $("detail-panel").classList.remove("translate-x-full");
}

export function hideDetailPanel() {
    $("detail-panel").classList.add("translate-x-full");
    selectedNode = null;
    panelMode = null;
    lastSourceId = null;
}

function renderDetailPanel(node) {
    if (!node) return;
    const isPinned = state.collection.has(node.id);
    const depth = node.type !== "query" && node.type !== "source" ? getNodeDepth(node.id) : null;
    const canExpand =
        !state.importedMode &&
        node.type !== "query" &&
        node.type !== "source" &&
        depth !== null &&
        depth < 3 &&
        state.nodes.size < state.nodeLimit;

    const src = SOURCES.find((s) => s.id === node.sourceId);

    const tagCls =
        "text-[11px] py-0.5 px-2 rounded-[10px] bg-surface2 border border-border text-text cursor-pointer transition-colors duration-200 hover:bg-accent hover:text-white hover:border-accent";
    const subjectTags = (node.rawSubjects || [])
        .map((s) => `<span class="${tagCls}" data-search="${s}">${s}</span>`)
        .join("");
    const creatorTags = (node.rawCreators || [])
        .map((c) => `<span class="${tagCls}" data-search="${c}">${c}</span>`)
        .join("");

    $("detail-content").innerHTML = `
  <div class="flex gap-1.5 flex-wrap mb-2.5">
    <span class="text-[10px] py-0.5 px-2 rounded-[10px] font-mono uppercase tracking-[0.5px] bg-surface2 text-dim">${node.type}</span>
    <span class="text-[10px] py-0.5 px-2 rounded-[10px] font-mono uppercase tracking-[0.5px] text-black font-semibold" style="background:${src ? getRegionColor(src.region) : "#888"}">${src?.label || node.sourceId}</span>
    ${node.expanded ? '<span class="text-[10px] py-0.5 px-2 rounded-[10px] font-mono uppercase tracking-[0.5px] bg-[rgba(58,143,255,0.2)] text-accent">expanded</span>' : ""}
    ${isPinned ? '<span class="text-[10px] py-0.5 px-2 rounded-[10px] font-mono uppercase tracking-[0.5px] bg-[rgba(255,215,0,0.2)] text-gold">pinned</span>' : ""}
  </div>
  <h2 class="text-[15px] font-semibold text-bright mb-1.5 leading-[1.4]">${node.label || "Untitled"}</h2>
  ${node.date ? `<div class="font-mono text-[11px] text-dim mb-2">${node.date}</div>` : ""}
  ${node.thumbnailUrl ? `<img class="w-full max-h-[160px] object-cover rounded-[4px] mb-2.5" src="${node.thumbnailUrl}" alt="">` : ""}
  ${node.description ? `<p class="text-xs text-text leading-[1.6] mb-2.5">${node.description}</p>` : ""}
  ${creatorTags ? `<div class="mb-2"><span class="text-[10px] uppercase tracking-[1px] text-dim block mb-1">Creators</span><div class="flex flex-wrap gap-1">${creatorTags}</div></div>` : ""}
  ${subjectTags ? `<div class="mb-2"><span class="text-[10px] uppercase tracking-[1px] text-dim block mb-1">Subjects</span><div class="flex flex-wrap gap-1">${subjectTags}</div></div>` : ""}
  ${node.url && node.url !== "#" ? `<div class="flex gap-2 items-center mb-3"><a class="text-xs text-accent no-underline hover:underline" href="${node.url}" target="_blank" rel="noopener">View original record ↗</a><button id="detail-iframe-btn" class="py-0.5 px-2 text-[11px] rounded-[4px] bg-surface2 border border-border text-text cursor-pointer hover:bg-border">View in panel</button></div>` : ""}
  <div class="flex flex-col gap-1.5 mt-3">
    <button id="pin-btn" class="py-2 px-3 rounded-[6px] bg-surface2 border cursor-pointer text-xs transition-colors duration-200 hover:bg-border ${isPinned ? "text-gold border-gold" : "text-text border-border"}">${isPinned ? "★ Unpin" : "☆ Pin to collection"}</button>
    ${canExpand ? '<button id="expand-btn" class="py-2 px-3 rounded-[6px] bg-surface2 border border-border text-text cursor-pointer text-xs transition-colors duration-200 hover:bg-border">Explore from here</button>' : ""}
  </div>
  ${
      isPinned
          ? `
    <div class="mt-3">
      <label class="text-[10px] uppercase tracking-[1px] text-dim block mb-1">Note</label>
      <textarea id="annotation-input" rows="3" placeholder="Add a note…" class="w-full bg-bg border border-border text-text rounded-[4px] p-1.5 text-xs font-sans resize-y">${node.annotation || ""}</textarea>
    </div>
  `
          : ""
  }
`;

    // Wire up actions
    const iframeBtnDetail = $("detail-iframe-btn");
    if (iframeBtnDetail) {
        iframeBtnDetail.addEventListener("click", () => showIframePanel(node.url));
    }

    $("pin-btn").addEventListener("click", () => {
        if (isPinned) unpinNode(node.id);
        else pinNode(node);
        refreshMap();
        renderDetailPanel(state.nodes.get(node.id) || node);
        renderCollectionDrawer();
    });

    const expandBtn = $("expand-btn");
    if (expandBtn) {
        expandBtn.addEventListener("click", () => {
            expandNode(node);
            hideDetailPanel();
        });
    }

    const annotationInput = $("annotation-input");
    if (annotationInput) {
        annotationInput.addEventListener("change", (e) => setAnnotation(node.id, e.target.value));
    }

    // Clickable subject/creator tags trigger new search
    $("detail-content")
        .querySelectorAll("[data-search]")
        .forEach((tag) => {
            tag.addEventListener("click", () => {
                $("search-input").value = tag.dataset.search;
                runSearch(tag.dataset.search);
                hideDetailPanel();
            });
        });
}

// ─── Status bar ───────────────────────────────────────────────────────────────

export function updateStatusBar() {
    const bar = $("status-bar");
    if (!bar) return;

    bar.innerHTML = [...state.sourceStatuses.entries()]
        .map(([id, s]) => {
            const src = SOURCES.find((x) => x.id === id);
            const label =
                s.status === "querying"
                    ? "…"
                    : s.status === "done"
                      ? `${s.count}`
                      : s.status === "error"
                        ? "✕"
                        : "";
            const chipBase =
                "font-mono text-[11px] py-0.5 px-2 rounded-xl border bg-[rgba(8,12,16,0.8)] whitespace-nowrap";
            const clsExtra =
                s.status === "error"
                    ? " text-[#ff6b6b]"
                    : s.status === "querying"
                      ? " opacity-70"
                      : "";
            return `<span class="${chipBase}${clsExtra}" style="border-color:${src ? getRegionColor(src.region) : "#888"}"
      title="${src?.label || id}: ${s.status}${s.latency ? " · " + s.latency + "ms" : ""}"
    >${src?.label || id} ${label}</span>`;
        })
        .join("");
}

export function updateNodeCapWarning() {
    const el = $("node-cap-warning");
    if (state.nodes.size >= state.nodeLimit) el.classList.remove("hidden");
    else el.classList.add("hidden");
}

// ─── Import / Export buttons ──────────────────────────────────────────────────

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

// ─── Drawer helpers ───────────────────────────────────────────────────────────

function toggleDrawer(id) {
    $(id).classList.toggle("-translate-x-full");
}

function closeDrawer(id) {
    $(id).classList.add("-translate-x-full");
}

// ─── Bus event listeners ──────────────────────────────────────────────────────

function setupBusListeners() {
    on("source:select", (sourceId) => {
        if (sourceId) showSourceSidebar(sourceId);
        else hideDetailPanel();
    });

    on("graph:update", () => {
        if (panelMode === "source" && lastSourceId) {
            _renderSourceList(lastSourceId);
        }
    });

    on("node:click", (node) => {
        showDetailPanel(node);
    });

    on("background:click", () => hideDetailPanel());

    on("source:status", () => {
        renderSourcePanel();
        updateStatusBar();
        updateNodeCapWarning();
    });

    on("collection:changed", () => {
        renderCollectionDrawer();
        if (selectedNode) renderDetailPanel(state.nodes.get(selectedNode.id) || selectedNode);
    });

    on("node:updated", (node) => {
        if (selectedNode?.id === node.id) renderDetailPanel(node);
        refreshMap();
    });

    on("node-cap:reached", updateNodeCapWarning);

    on("import:done", () => {
        renderSourcePanel();
        updateStatusBar();
        renderCollectionDrawer();
        zoomToFit();
    });

    on("search:start", () => {
        renderSourcePanel();
        updateStatusBar();
        hideDetailPanel();
    });

    on("search:done", () => {
        updateNodeCapWarning();
    });
}
