import { state, saveCollectionToStorage, resetGraph } from './state.js'
import { emit } from './bus.js'
import { clearMap, syncAllSourceCards } from './mapview.js'
import { SOURCES, getSource } from './sources.js'

export function pinNode(node) {
  if (state.collection.has(node.id)) return
  state.collection.set(node.id, {
    annotation: node.annotation || '',
    pinnedAt: new Date().toISOString(),
    result: node.result || null,
    label: node.label,
    sourceId: node.sourceId,
    color: node.color,
    rawSubjects: node.rawSubjects || [],
    rawCreators: node.rawCreators || [],
  })
  node.pinned = true
  saveCollectionToStorage()
  emit('collection:changed')
}

export function unpinNode(nodeId) {
  if (!state.collection.has(nodeId)) return
  state.collection.delete(nodeId)
  const node = state.nodes.get(nodeId)
  if (node) node.pinned = false
  saveCollectionToStorage()
  emit('collection:changed')
}

export function setAnnotation(nodeId, text) {
  const entry = state.collection.get(nodeId)
  if (!entry) return
  entry.annotation = text
  const node = state.nodes.get(nodeId)
  if (node) node.annotation = text
  saveCollectionToStorage()
  emit('collection:changed')
}

export function exportCollection() {
  const nodes = []
  const sourceIds = new Set()

  for (const [nodeId, entry] of state.collection) {
    sourceIds.add(entry.sourceId)
    nodes.push({
      id: nodeId,
      label: entry.label,
      type: entry.result?.type || 'work',
      sourceId: entry.sourceId,
      annotation: entry.annotation,
      result: entry.result,
    })
  }

  const sources = SOURCES
    .filter(s => sourceIds.has(s.id))
    .map(s => ({ id: s.id, label: s.label, color: s.color }))

  const payload = {
    version: '1.0',
    meta: {
      created: new Date().toISOString(),
      query_history: [...state.queryHistory],
      description: '',
    },
    sources,
    nodes,
    edges: [],
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `library-graph-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function importGraph(data) {
  if (!data.nodes) {
    alert('Not a valid library graph file.')
    return
  }

  resetGraph()
  clearMap()
  state.importedMode = true
  state.queryHistory = data.meta?.query_history || []

  // Build source color map from file
  const sourceColors = {}
  for (const s of (data.sources || [])) sourceColors[s.id] = s.color

  for (const n of data.nodes) {
    const color = sourceColors[n.sourceId] || getSource(n.sourceId)?.color || '#888888'

    const node = {
      id: n.id,
      label: n.label,
      type: n.type || 'work',
      sourceId: n.sourceId,
      color,
      result: n.result || null,
      rawSubjects: n.result?.rawSubjects || [],
      rawCreators: n.result?.rawCreators || [],
      pinned: state.collection.has(n.id),
      expanded: false,
      annotation: n.annotation || '',
    }
    state.nodes.set(node.id, node)
  }

  syncAllSourceCards()
  emit('import:done', data)
}
