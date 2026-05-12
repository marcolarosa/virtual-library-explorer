import { state } from './state.js'
import { on, emit } from './bus.js'
import { SOURCES, API_KEYS, setApiKey } from './sources.js'
import { pinNode, unpinNode, setAnnotation, exportCollection, importGraph } from './collection.js'
import { runSearch, expandNode, getNodeDepth, addUserLink } from './search.js'
import { zoomToFit, togglePhysics, refreshGraph } from './graph.js'
import { debounce, truncate } from './utils.js'

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const $ = id => document.getElementById(id)

let selectedNode = null

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initUI() {
  setupSearch()
  setupControls()
  setupSourcePanel()
  setupCollectionDrawer()
  setupDetailPanel()
  setupKeysModal()
  setupImportExport()
  setupBusListeners()
}

// ─── Search ───────────────────────────────────────────────────────────────────

function setupSearch() {
  const input = $('search-input')
  const btn = $('search-btn')

  const doSearch = debounce(() => {
    const q = input.value.trim()
    if (q) runSearch(q)
  }, 400)

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); doSearch() }
  })
  btn.addEventListener('click', doSearch)
}

// ─── Controls ─────────────────────────────────────────────────────────────────

function setupControls() {
  $('zoom-fit').addEventListener('click', zoomToFit)

  $('pause-physics').addEventListener('click', () => {
    const paused = togglePhysics()
    $('pause-physics').textContent = paused ? '▶' : '⏸'
    $('pause-physics').title = paused ? 'Resume physics' : 'Pause physics'
  })

  $('toggle-labels').addEventListener('click', () => {
    state.labelsVisible = !state.labelsVisible
    $('toggle-labels').classList.toggle('active', state.labelsVisible)
    refreshGraph()
  })

  $('reset-graph').addEventListener('click', () => {
    if (!confirm('Reset the graph? Your collection is preserved.')) return
    const { resetGraph } = window.__appModules
    resetGraph()
    const { clearGraph } = window.__appModules
    clearGraph()
    updateStatusBar()
    hideDetailPanel()
    updateNodeCapWarning()
  })

  setupFilters()
}

function setupFilters() {
  const filterContainer = $('filter-sources')
  const typeContainer = $('filter-types')

  // Source filters
  filterContainer.innerHTML = ''
  for (const src of SOURCES) {
    const label = document.createElement('label')
    label.className = 'filter-chip'
    label.style.setProperty('--chip-color', src.color)
    label.innerHTML = `<input type="checkbox" checked data-source="${src.id}"> ${src.shortLabel}`
    label.querySelector('input').addEventListener('change', e => {
      if (e.target.checked) state.filters.hiddenSources.delete(src.id)
      else state.filters.hiddenSources.add(src.id)
      refreshGraph()
    })
    filterContainer.appendChild(label)
  }

  // Type filters
  const types = ['work', 'person', 'subject', 'place', 'organisation']
  typeContainer.innerHTML = ''
  for (const type of types) {
    const label = document.createElement('label')
    label.className = 'filter-chip'
    label.innerHTML = `<input type="checkbox" checked data-type="${type}"> ${type}`
    label.querySelector('input').addEventListener('change', e => {
      if (e.target.checked) state.filters.hiddenTypes.delete(type)
      else state.filters.hiddenTypes.add(type)
      refreshGraph()
    })
    typeContainer.appendChild(label)
  }
}

// ─── Source panel ─────────────────────────────────────────────────────────────

function setupSourcePanel() {
  $('source-panel-toggle').addEventListener('click', () => {
    const list = $('source-list')
    const isCollapsed = list.style.display === 'none'
    list.style.display = isCollapsed ? '' : 'none'
    $('source-panel-toggle').textContent = isCollapsed ? '−' : '+'
  })
  renderSourcePanel()
}

export function renderSourcePanel() {
  const list = $('source-list')
  list.innerHTML = ''
  for (const src of SOURCES) {
    const status = state.sourceStatuses.get(src.id) || { status: 'idle' }
    const row = document.createElement('div')
    row.className = 'source-row'
    row.dataset.sourceId = src.id

    const statusText = {
      idle: 'idle',
      querying: '<span class="blink">querying…</span>',
      done: `${status.count} results${status.latency ? ' · ' + status.latency + 'ms' : ''}`,
      error: '<span class="error">error</span>',
    }[status.status] || 'idle'

    row.innerHTML = `
      <span class="source-swatch" style="background:${src.color}"></span>
      <label class="source-toggle">
        <input type="checkbox" ${src.enabled ? 'checked' : ''}>
        <span class="source-label">${src.shortLabel}</span>
      </label>
      <span class="source-status">${statusText}${src.requiresKey && !API_KEYS[src.id] ? ' <span class="key-warn" title="No API key set">⚿</span>' : ''}</span>
    `
    row.querySelector('input').addEventListener('change', e => {
      src.enabled = e.target.checked
    })
    list.appendChild(row)
  }
}

// ─── Collection drawer ────────────────────────────────────────────────────────

function setupCollectionDrawer() {
  $('collection-toggle').addEventListener('click', () => toggleDrawer('collection-drawer'))
  $('collection-close').addEventListener('click', () => closeDrawer('collection-drawer'))
  $('export-btn-2').addEventListener('click', exportCollection)
}

export function renderCollectionDrawer() {
  const list = $('collection-list')
  if (state.collection.size === 0) {
    list.innerHTML = '<p class="empty-hint">No items pinned yet.<br>Click a node and pin it.</p>'
    return
  }

  // Group by source
  const bySource = new Map()
  for (const [nodeId, entry] of state.collection) {
    if (!bySource.has(entry.sourceId)) bySource.set(entry.sourceId, [])
    bySource.get(entry.sourceId).push([nodeId, entry])
  }

  list.innerHTML = ''
  for (const [sourceId, items] of bySource) {
    const src = SOURCES.find(s => s.id === sourceId)
    const group = document.createElement('div')
    group.className = 'collection-group'
    group.innerHTML = `<div class="collection-group-header" style="color:${src?.color || '#888'}">${src?.label || sourceId}</div>`

    for (const [nodeId, entry] of items) {
      const item = document.createElement('div')
      item.className = 'collection-item'
      item.innerHTML = `
        <div class="collection-item-title">${truncate(entry.label, 50)}</div>
        <textarea class="collection-annotation" placeholder="Add note…" rows="2">${entry.annotation || ''}</textarea>
        <div class="collection-item-actions">
          <button class="btn-small" data-action="focus" data-id="${nodeId}">Find</button>
          <button class="btn-small btn-danger" data-action="unpin" data-id="${nodeId}">Remove</button>
        </div>
      `
      item.querySelector('[data-action="unpin"]').addEventListener('click', () => {
        unpinNode(nodeId)
        renderCollectionDrawer()
        if (selectedNode?.id === nodeId) renderDetailPanel(selectedNode)
        refreshGraph()
      })
      item.querySelector('textarea').addEventListener('change', e => {
        setAnnotation(nodeId, e.target.value)
      })
      item.querySelector('[data-action="focus"]').addEventListener('click', () => {
        const node = state.nodes.get(nodeId)
        if (node && window.__graphInstance) {
          window.__graphInstance.centerAt(node.x, node.y, 500)
          window.__graphInstance.zoom(2, 500)
        }
      })
      group.appendChild(item)
    }
    list.appendChild(group)
  }
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function setupDetailPanel() {
  $('detail-close').addEventListener('click', hideDetailPanel)
}

export function showDetailPanel(node) {
  selectedNode = node
  renderDetailPanel(node)
  $('detail-panel').classList.remove('hidden')
}

export function hideDetailPanel() {
  $('detail-panel').classList.add('hidden')
  selectedNode = null
  if (state.linkModeActive) {
    state.linkModeActive = false
    state.linkModeSourceNode = null
    emit('link-mode:cancel')
  }
}

function renderDetailPanel(node) {
  if (!node) return
  const isPinned = state.collection.has(node.id)
  const depth = node.type !== 'query' && node.type !== 'source' ? getNodeDepth(node.id) : null
  const canExpand = !state.importedMode && node.type !== 'query' && node.type !== 'source'
    && depth !== null && depth < 3 && state.nodes.size < state.nodeLimit

  const src = SOURCES.find(s => s.id === node.sourceId)
  const result = node.result || {}

  const subjectTags = (node.rawSubjects || [])
    .map(s => `<span class="tag" data-search="${s}">${s}</span>`).join('')
  const creatorTags = (node.rawCreators || [])
    .map(c => `<span class="tag" data-search="${c}">${c}</span>`).join('')

  $('detail-content').innerHTML = `
    <div class="detail-badges">
      <span class="badge type-badge">${node.type}</span>
      <span class="badge source-badge" style="background:${src?.color || '#888'}">${src?.shortLabel || node.sourceId}</span>
      ${node.expanded ? '<span class="badge expanded-badge">expanded</span>' : ''}
      ${isPinned ? '<span class="badge pinned-badge">pinned</span>' : ''}
    </div>
    <h2 class="detail-title">${node.label || 'Untitled'}</h2>
    ${result.date ? `<div class="detail-date">${result.date}</div>` : ''}
    ${result.thumbnailUrl ? `<img class="detail-thumb" src="${result.thumbnailUrl}" alt="">` : ''}
    ${result.description ? `<p class="detail-desc">${result.description}</p>` : ''}
    ${creatorTags ? `<div class="detail-section"><span class="detail-section-label">Creators</span><div class="tag-list">${creatorTags}</div></div>` : ''}
    ${subjectTags ? `<div class="detail-section"><span class="detail-section-label">Subjects</span><div class="tag-list">${subjectTags}</div></div>` : ''}
    ${result.url && result.url !== '#' ? `<a class="detail-link" href="${result.url}" target="_blank" rel="noopener">View original record ↗</a>` : ''}
    <div class="detail-actions">
      <button id="pin-btn" class="${isPinned ? 'btn-pinned' : ''}">${isPinned ? '★ Unpin' : '☆ Pin to collection'}</button>
      ${canExpand ? '<button id="expand-btn">Explore from here</button>' : ''}
      ${!state.importedMode ? '<button id="link-btn">Link to another node</button>' : ''}
    </div>
    ${isPinned ? `
      <div class="detail-annotation">
        <label>Note</label>
        <textarea id="annotation-input" rows="3" placeholder="Add a note…">${node.annotation || ''}</textarea>
      </div>
    ` : ''}
  `

  // Wire up actions
  $('pin-btn').addEventListener('click', () => {
    if (isPinned) unpinNode(node.id)
    else pinNode(node)
    refreshGraph()
    renderDetailPanel(state.nodes.get(node.id) || node)
    renderCollectionDrawer()
  })

  const expandBtn = $('expand-btn')
  if (expandBtn) {
    expandBtn.addEventListener('click', () => {
      expandNode(node)
      hideDetailPanel()
    })
  }

  const linkBtn = $('link-btn')
  if (linkBtn) {
    linkBtn.addEventListener('click', () => {
      state.linkModeActive = true
      state.linkModeSourceNode = node
      linkBtn.textContent = 'Click another node to link…'
      linkBtn.classList.add('active')
    })
  }

  const annotationInput = $('annotation-input')
  if (annotationInput) {
    annotationInput.addEventListener('change', e => setAnnotation(node.id, e.target.value))
  }

  // Clickable subject/creator tags trigger new search
  $('detail-content').querySelectorAll('.tag[data-search]').forEach(tag => {
    tag.addEventListener('click', () => {
      $('search-input').value = tag.dataset.search
      runSearch(tag.dataset.search)
      hideDetailPanel()
    })
  })
}

// ─── Status bar ───────────────────────────────────────────────────────────────

export function updateStatusBar() {
  const bar = $('status-bar')
  if (state.sourceStatuses.size === 0) { bar.innerHTML = ''; return }

  bar.innerHTML = [...state.sourceStatuses.entries()].map(([id, s]) => {
    const src = SOURCES.find(x => x.id === id)
    const cls = s.status === 'error' ? 'status-error' : s.status === 'querying' ? 'status-querying' : 'status-done'
    const label = s.status === 'querying' ? '…'
      : s.status === 'done' ? `${s.count}`
      : s.status === 'error' ? '✕'
      : ''
    return `<span class="status-chip ${cls}" style="border-color:${src?.color || '#888'}"
      title="${src?.label || id}: ${s.status}${s.latency ? ' · ' + s.latency + 'ms' : ''}"
    >${src?.shortLabel || id} ${label}</span>`
  }).join('')
}

export function updateNodeCapWarning() {
  const el = $('node-cap-warning')
  if (state.nodes.size >= state.nodeLimit) el.classList.remove('hidden')
  else el.classList.add('hidden')
}

// ─── Keys modal ───────────────────────────────────────────────────────────────

function setupKeysModal() {
  $('keys-btn').addEventListener('click', openKeysModal)
  $('keys-cancel').addEventListener('click', closeKeysModal)
  $('keys-save').addEventListener('click', saveKeys)
}

function openKeysModal() {
  const form = $('keys-form')
  form.innerHTML = ''
  const keyed = SOURCES.filter(s => s.requiresKey)
  for (const src of keyed) {
    const row = document.createElement('div')
    row.className = 'keys-row'
    row.innerHTML = `
      <label style="color:${src.color}">${src.label}</label>
      <input type="text" class="key-input" data-source="${src.id}"
        value="${API_KEYS[src.id] || ''}"
        placeholder="Paste API key…"
        spellcheck="false" autocomplete="off">
    `
    form.appendChild(row)
  }
  $('keys-modal').classList.remove('hidden')
}

function closeKeysModal() {
  $('keys-modal').classList.add('hidden')
}

function saveKeys() {
  document.querySelectorAll('.key-input[data-source]').forEach(input => {
    setApiKey(input.dataset.source, input.value.trim())
  })
  closeKeysModal()
  renderSourcePanel()
}

// ─── Import / Export buttons ──────────────────────────────────────────────────

function setupImportExport() {
  $('export-btn').addEventListener('click', exportCollection)
  $('import-btn').addEventListener('click', () => $('import-file').click())
  $('import-file').addEventListener('change', e => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result)
        importGraph(data)
      } catch (err) {
        alert('Failed to load graph: ' + err.message)
      }
    }
    reader.readAsText(file)
    e.target.value = '' // reset so same file can be re-imported
  })
}

// ─── Drawer helpers ───────────────────────────────────────────────────────────

function toggleDrawer(id) {
  const el = $(id)
  el.classList.toggle('collapsed')
}

function closeDrawer(id) {
  $(id).classList.add('collapsed')
}

// ─── Bus event listeners ──────────────────────────────────────────────────────

function setupBusListeners() {
  on('node:click', node => {
    if (state.linkModeActive && state.linkModeSourceNode) {
      if (node.id !== state.linkModeSourceNode.id) {
        addUserLink(state.linkModeSourceNode, node)
        state.linkModeActive = false
        state.linkModeSourceNode = null
      }
      return
    }
    showDetailPanel(node)
  })

  on('background:click', () => hideDetailPanel())

  on('source:status', () => {
    renderSourcePanel()
    updateStatusBar()
    updateNodeCapWarning()
  })

  on('collection:changed', () => {
    renderCollectionDrawer()
    if (selectedNode) renderDetailPanel(state.nodes.get(selectedNode.id) || selectedNode)
  })

  on('node:updated', node => {
    if (selectedNode?.id === node.id) renderDetailPanel(node)
    refreshGraph()
  })

  on('node-cap:reached', updateNodeCapWarning)

  on('import:done', () => {
    renderSourcePanel()
    updateStatusBar()
    renderCollectionDrawer()
    zoomToFit()
  })

  on('search:start', () => {
    renderSourcePanel()
    updateStatusBar()
    hideDetailPanel()
  })

  on('search:done', () => {
    updateNodeCapWarning()
    zoomToFit()
  })
}
