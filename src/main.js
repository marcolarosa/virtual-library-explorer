import { loadCollectionFromStorage, resetGraph } from './state.js'
import { initMap, clearMap } from './mapview.js'
import { initUI, renderCollectionDrawer, renderSourcePanel } from './ui.js'

const container = document.getElementById('graph-container')
initMap(container)

window.__appModules = { resetGraph, clearMap }

loadCollectionFromStorage()

initUI()
renderSourcePanel()
renderCollectionDrawer()
