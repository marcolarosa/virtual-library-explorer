import { state } from "./state.js";
import { on, emit } from "./bus.js";
import { SOURCES } from "./sources.js";
import { pinNode, unpinNode, setAnnotation, exportCollection, importGraph } from "./collection.js";
import { runSearch, expandNode, getNodeDepth, addUserLink } from "./search.js";
import { zoomToFit, togglePhysics, refreshGraph } from "./graph.js";
import { debounce, truncate } from "./utils.js";

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

let selectedNode = null;

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initUI() {
    setupSearch();
    setupControls();
    setupSourcePanel();
    setupCollectionDrawer();
    setupDetailPanel();
    setupImportExport();
    setupBusListeners();
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

function setupControls() {
    $("zoom-fit").addEventListener("click", zoomToFit);

    $("pause-physics").addEventListener("click", () => {
        const paused = togglePhysics();
        $("pause-physics").textContent = paused ? "▶" : "⏸";
        $("pause-physics").title = paused ? "Resume physics" : "Pause physics";
    });

    $("toggle-labels").addEventListener("click", () => {
        state.labelsVisible = !state.labelsVisible;
        const btn = $("toggle-labels");
        btn.classList.toggle("text-accent", state.labelsVisible);
        btn.classList.toggle("border-accent", state.labelsVisible);
        btn.classList.toggle("text-dim", !state.labelsVisible);
        btn.classList.toggle("border-border", !state.labelsVisible);
        refreshGraph();
    });

    $("reset-graph").addEventListener("click", () => {
        if (!confirm("Reset the graph? Your collection is preserved.")) return;
        const { resetGraph } = window.__appModules;
        resetGraph();
        const { clearGraph } = window.__appModules;
        clearGraph();
        updateStatusBar();
        hideDetailPanel();
        updateNodeCapWarning();
    });

    setupFilters();
}

function setupFilters() {
    const filterContainer = $("filter-sources");
    const typeContainer = $("filter-types");

    // Source filters
    filterContainer.innerHTML = "";
    for (const src of SOURCES) {
        const label = document.createElement("label");
        label.className =
            "flex items-center gap-1 py-[3px] px-2 rounded-[10px] bg-surface border border-border text-dim text-[11px] cursor-pointer hover:bg-surface2";
        label.style.borderLeft = `3px solid ${src.color}`;
        label.innerHTML = `<input type="checkbox" class="accent-accent" checked data-source="${src.id}"> ${src.shortLabel}`;
        label.querySelector("input").addEventListener("change", (e) => {
            if (e.target.checked) state.filters.hiddenSources.delete(src.id);
            else state.filters.hiddenSources.add(src.id);
            refreshGraph();
        });
        filterContainer.appendChild(label);
    }

    // Type filters
    const types = ["work", "person", "subject", "place", "organisation"];
    typeContainer.innerHTML = "";
    for (const type of types) {
        const label = document.createElement("label");
        label.className =
            "flex items-center gap-1 py-[3px] px-2 rounded-[10px] bg-surface border border-border text-dim text-[11px] cursor-pointer hover:bg-surface2";
        label.innerHTML = `<input type="checkbox" class="accent-accent" checked data-type="${type}"> ${type}`;
        label.querySelector("input").addEventListener("change", (e) => {
            if (e.target.checked) state.filters.hiddenTypes.delete(type);
            else state.filters.hiddenTypes.add(type);
            refreshGraph();
        });
        typeContainer.appendChild(label);
    }
}

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
        row.className = "flex items-center gap-1.5 px-3 py-1 text-xs";
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
      <label class="flex items-center gap-1 cursor-pointer flex-1">
        <input type="checkbox" class="accent-accent" ${src.enabled ? "checked" : ""}>
        <span class="text-text">${src.shortLabel}</span>
      </label>
      <span class="text-[10px] text-dim font-mono">${statusText}</span>
    `;
        row.querySelector("input").addEventListener("change", (e) => {
            src.enabled = e.target.checked;
        });
        list.appendChild(row);
    }
}

// ─── Collection drawer ────────────────────────────────────────────────────────

function setupCollectionDrawer() {
    $("collection-toggle").addEventListener("click", () => toggleDrawer("collection-drawer"));
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
        group.innerHTML = `<div class="font-mono text-[10px] uppercase tracking-[1px] px-3.5 py-1.5 font-semibold" style="color:${src?.color || "#888"}">${src?.label || sourceId}</div>`;

        for (const [nodeId, entry] of items) {
            const item = document.createElement("div");
            item.className = "px-3.5 py-2 border-b border-border hover:bg-surface2";
            item.innerHTML = `
        <div class="text-xs text-bright mb-1">${truncate(entry.label, 50)}</div>
        <textarea class="w-full bg-bg border border-border text-text rounded-[4px] px-1.5 py-1 text-[11px] font-sans resize-y mb-1" placeholder="Add note…" rows="2">${entry.annotation || ""}</textarea>
        <div class="flex gap-1.5">
          <button class="py-0.5 px-2 text-[11px] rounded-[4px] bg-surface2 border border-border text-text cursor-pointer hover:bg-border" data-action="focus" data-id="${nodeId}">Find</button>
          <button class="py-0.5 px-2 text-[11px] rounded-[4px] bg-surface2 border border-border text-[#ff6b6b] cursor-pointer hover:bg-[rgba(255,107,107,0.15)]" data-action="unpin" data-id="${nodeId}">Remove</button>
        </div>
      `;
            item.querySelector('[data-action="unpin"]').addEventListener("click", () => {
                unpinNode(nodeId);
                renderCollectionDrawer();
                if (selectedNode?.id === nodeId) renderDetailPanel(selectedNode);
                refreshGraph();
            });
            item.querySelector("textarea").addEventListener("change", (e) => {
                setAnnotation(nodeId, e.target.value);
            });
            item.querySelector('[data-action="focus"]').addEventListener("click", () => {
                const node = state.nodes.get(nodeId);
                if (node && window.__graphInstance) {
                    window.__graphInstance.centerAt(node.x, node.y, 500);
                    window.__graphInstance.zoom(2, 500);
                }
            });
            group.appendChild(item);
        }
        list.appendChild(group);
    }
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function setupDetailPanel() {
    $("detail-close").addEventListener("click", hideDetailPanel);
}

export function showDetailPanel(node) {
    selectedNode = node;
    renderDetailPanel(node);
    $("detail-panel").classList.remove("translate-x-full");
}

export function hideDetailPanel() {
    $("detail-panel").classList.add("translate-x-full");
    selectedNode = null;
    if (state.linkModeActive) {
        state.linkModeActive = false;
        state.linkModeSourceNode = null;
        emit("link-mode:cancel");
    }
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
    const result = node.result || {};

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
    <span class="text-[10px] py-0.5 px-2 rounded-[10px] font-mono uppercase tracking-[0.5px] text-black font-semibold" style="background:${src?.color || "#888"}">${src?.shortLabel || node.sourceId}</span>
    ${node.expanded ? '<span class="text-[10px] py-0.5 px-2 rounded-[10px] font-mono uppercase tracking-[0.5px] bg-[rgba(58,143,255,0.2)] text-accent">expanded</span>' : ""}
    ${isPinned ? '<span class="text-[10px] py-0.5 px-2 rounded-[10px] font-mono uppercase tracking-[0.5px] bg-[rgba(255,215,0,0.2)] text-gold">pinned</span>' : ""}
  </div>
  <h2 class="text-[15px] font-semibold text-bright mb-1.5 leading-[1.4]">${node.label || "Untitled"}</h2>
  ${result.date ? `<div class="font-mono text-[11px] text-dim mb-2">${result.date}</div>` : ""}
  ${result.thumbnailUrl ? `<img class="w-full max-h-[160px] object-cover rounded-[4px] mb-2.5" src="${result.thumbnailUrl}" alt="">` : ""}
  ${result.description ? `<p class="text-xs text-text leading-[1.6] mb-2.5">${result.description}</p>` : ""}
  ${creatorTags ? `<div class="mb-2"><span class="text-[10px] uppercase tracking-[1px] text-dim block mb-1">Creators</span><div class="flex flex-wrap gap-1">${creatorTags}</div></div>` : ""}
  ${subjectTags ? `<div class="mb-2"><span class="text-[10px] uppercase tracking-[1px] text-dim block mb-1">Subjects</span><div class="flex flex-wrap gap-1">${subjectTags}</div></div>` : ""}
  ${result.url && result.url !== "#" ? `<a class="inline-block text-xs text-accent no-underline mb-3 hover:underline" href="${result.url}" target="_blank" rel="noopener">View original record ↗</a>` : ""}
  <div class="flex flex-col gap-1.5 mt-3">
    <button id="pin-btn" class="py-2 px-3 rounded-[6px] bg-surface2 border cursor-pointer text-xs transition-colors duration-200 hover:bg-border ${isPinned ? "text-gold border-gold" : "text-text border-border"}">${isPinned ? "★ Unpin" : "☆ Pin to collection"}</button>
    ${canExpand ? '<button id="expand-btn" class="py-2 px-3 rounded-[6px] bg-surface2 border border-border text-text cursor-pointer text-xs transition-colors duration-200 hover:bg-border">Explore from here</button>' : ""}
    ${!state.importedMode ? '<button id="link-btn" class="py-2 px-3 rounded-[6px] bg-surface2 border border-border text-text cursor-pointer text-xs transition-colors duration-200 hover:bg-border">Link to another node</button>' : ""}
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
    $("pin-btn").addEventListener("click", () => {
        if (isPinned) unpinNode(node.id);
        else pinNode(node);
        refreshGraph();
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

    const linkBtn = $("link-btn");
    if (linkBtn) {
        linkBtn.addEventListener("click", () => {
            state.linkModeActive = true;
            state.linkModeSourceNode = node;
            linkBtn.textContent = "Click another node to link…";
            linkBtn.classList.remove("bg-surface2", "text-text", "border-border");
            linkBtn.classList.add("bg-accent", "text-white", "border-accent");
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
    if (state.sourceStatuses.size === 0) {
        bar.innerHTML = "";
        return;
    }

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
            return `<span class="${chipBase}${clsExtra}" style="border-color:${src?.color || "#888"}"
      title="${src?.label || id}: ${s.status}${s.latency ? " · " + s.latency + "ms" : ""}"
    >${src?.shortLabel || id} ${label}</span>`;
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
    $("export-btn").addEventListener("click", exportCollection);
    $("import-btn").addEventListener("click", () => $("import-file").click());
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
        e.target.value = ""; // reset so same file can be re-imported
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
    on("node:click", (node) => {
        if (state.linkModeActive && state.linkModeSourceNode) {
            if (node.id !== state.linkModeSourceNode.id) {
                addUserLink(state.linkModeSourceNode, node);
                state.linkModeActive = false;
                state.linkModeSourceNode = null;
            }
            return;
        }
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
        refreshGraph();
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
        zoomToFit();
    });
}
