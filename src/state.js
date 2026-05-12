export const state = {
  nodes: new Map(),        // id -> node object
  edges: new Map(),        // id -> edge object
  collection: new Map(),   // nodeId -> { annotation, pinnedAt, result, label, sourceId }
  queryHistory: [],
  importedMode: false,
  nodeLimit: 500,
  labelsVisible: true,
  physicsPaused: false,
  linkModeActive: false,
  linkModeSourceNode: null,
  filters: {
    hiddenSources: new Set(),
    hiddenTypes: new Set(),
  },
  sourceStatuses: new Map(), // sourceId -> { status, count, latency, proxyUsed }
}

const COLLECTION_KEY = 'library-explorer:collection'

export function loadCollectionFromStorage() {
  try {
    const raw = localStorage.getItem(COLLECTION_KEY)
    if (!raw) return
    const entries = JSON.parse(raw)
    state.collection = new Map(Object.entries(entries))
  } catch (e) {
    console.warn('Failed to load collection:', e)
  }
}

export function saveCollectionToStorage() {
  try {
    localStorage.setItem(COLLECTION_KEY, JSON.stringify(Object.fromEntries(state.collection)))
  } catch (e) {
    console.warn('Failed to save collection:', e)
  }
}

export function resetGraph() {
  state.nodes.clear()
  state.edges.clear()
  state.queryHistory = []
  state.importedMode = false
  state.sourceStatuses.clear()
  state.linkModeActive = false
  state.linkModeSourceNode = null
}
