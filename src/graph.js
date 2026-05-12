import { state } from './state.js'
import { emit } from './bus.js'
import { sourceAnchorId } from './utils.js'

let graphInstance = null

const NODE_SIZES = {
  work: 4, person: 4, subject: 6, place: 4,
  organisation: 4, query: 8, source: 14, unknown: 4,
}

const LINK_COLORS = {
  'query-to-result':  'rgba(255,255,255,0.35)',
  'result-to-anchor': 'rgba(255,255,255,0.15)',
  'shared-subject':   'rgba(180,180,255,0.5)',
  'shared-creator':   'rgba(255,200,100,0.5)',
  'user-link':        '#ffd700',
}

export function initGraph(container) {
  graphInstance = ForceGraph3D()(container)
    .width(container.clientWidth)
    .height(container.clientHeight)
    .backgroundColor('#080c10')
    .nodeId('id')
    .nodeLabel(n => state.labelsVisible ? n.label : '')
    .nodeColor(n => {
      if (n.pinned) return '#ffd700'
      if (state.filters.hiddenSources.has(n.sourceId)) return 'rgba(100,100,100,0.2)'
      if (state.filters.hiddenTypes.has(n.type)) return 'rgba(100,100,100,0.2)'
      return n.color || '#ffffff'
    })
    .nodeVal(n => NODE_SIZES[n.type] || 4)
    .nodeOpacity(0.9)
    .nodeResolution(8)
    .nodeVisibility(n => {
      if (state.filters.hiddenSources.has(n.sourceId) && n.type !== 'query' && n.type !== 'source') return false
      if (state.filters.hiddenTypes.has(n.type) && n.type !== 'query' && n.type !== 'source') return false
      return true
    })
    .linkSource('source')
    .linkTarget('target')
    .linkColor(l => l.crossSource ? '#ffffff' : (LINK_COLORS[l.type] || 'rgba(255,255,255,0.2)'))
    .linkWidth(l => l.type === 'user-link' ? 3 : (l.crossSource ? 1.5 : 0.5))
    .linkOpacity(0.7)
    .linkDirectionalParticles(l => l.crossSource ? 4 : 0)
    .linkDirectionalParticleColor(() => '#fff')
    .linkDirectionalParticleWidth(1.5)
    .linkDirectionalParticleSpeed(0.005)
    .linkVisibility(l => {
      const { edges } = state
      if (edges.size > 200 && (l.type === 'shared-subject' || l.type === 'shared-creator') && !l.crossSource) {
        return false
      }
      return true
    })
    .onNodeClick(node => {
      emit('node:click', node)
    })
    .onNodeHover(node => {
      container.style.cursor = node ? 'pointer' : 'default'
      emit('node:hover', node)
    })
    .onBackgroundClick(() => {
      emit('background:click')
    })

  window.addEventListener('resize', () => {
    graphInstance.width(container.clientWidth).height(container.clientHeight)
  })

  return graphInstance
}

export function getGraph() {
  return graphInstance
}

export function addToGraph(newNodes, newLinks) {
  if (!graphInstance) return
  const { nodes: curNodes, links: curLinks } = graphInstance.graphData()
  const curNodeIds = new Set(curNodes.map(n => n.id))
  const curLinkIds = new Set(curLinks.map(l => l.id))

  const nodesToAdd = newNodes.filter(n => !curNodeIds.has(n.id))
  const linksToAdd = newLinks.filter(l => !curLinkIds.has(l.id)).map(l => ({ ...l }))

  if (nodesToAdd.length === 0 && linksToAdd.length === 0) return

  graphInstance.graphData({
    nodes: [...curNodes, ...nodesToAdd],
    links: [...curLinks, ...linksToAdd],
  })
}

export function clearGraph() {
  if (!graphInstance) return
  graphInstance.graphData({ nodes: [], links: [] })
}

export function refreshGraph() {
  if (!graphInstance) return
  const { nodes, links } = graphInstance.graphData()
  // Trigger re-render by nudging graphData with same data
  graphInstance.graphData({ nodes: [...nodes], links: links.map(l => ({ ...l })) })
}

export function zoomToFit() {
  graphInstance?.zoomToFit(400)
}

export function togglePhysics() {
  if (!graphInstance) return
  if (state.physicsPaused) {
    graphInstance.resumeAnimation()
    state.physicsPaused = false
  } else {
    graphInstance.pauseAnimation()
    state.physicsPaused = true
  }
  return state.physicsPaused
}

export function positionHintForSource(source) {
  // Loose geographic clusters as initial position hints
  const hints = {
    Oceania:  { x: 250, y: 0,    z: 0 },
    Europe:   { x: -200, y: 50,  z: 0 },
    Americas: { x: -80, y: -50,  z: 0 },
    Mock:     { x: 0,   y: 200,  z: 0 },
  }
  return hints[source.region] || { x: 0, y: 0, z: 0 }
}

export function makeQueryNode(queryStr) {
  return {
    id: `query::${queryStr.toLowerCase().trim()}`,
    label: queryStr,
    type: 'query',
    sourceId: 'query',
    color: '#ffffff',
    result: null,
    pinned: false,
    expanded: false,
    annotation: '',
    fx: 0, fy: 0, fz: 0, // pin at origin
  }
}

export function makeSourceAnchor(source) {
  const hint = positionHintForSource(source)
  return {
    id: sourceAnchorId(source.id),
    label: source.shortLabel,
    type: 'source',
    sourceId: source.id,
    color: source.color,
    result: null,
    pinned: false,
    expanded: false,
    annotation: '',
    ...hint,
  }
}
