import { state, loadCollectionFromStorage, resetGraph } from './state.js'
import { initGraph, clearGraph, getGraph } from './graph.js'
import { initUI, renderCollectionDrawer, renderSourcePanel } from './ui.js'

const container = document.getElementById('graph-container')
const graph = initGraph(container)

// Expose for reset button in ui.js (avoids circular import)
window.__appModules = { resetGraph, clearGraph }
window.__graphInstance = graph

loadCollectionFromStorage()

initUI()
renderSourcePanel()
renderCollectionDrawer()
