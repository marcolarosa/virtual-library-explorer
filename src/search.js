import { state, resetGraph } from './state.js'
import { emit } from './bus.js'
import { addToGraph, clearGraph, makeQueryNode, makeSourceAnchor } from './graph.js'
import { enabledSources, getSource } from './sources.js'
import { queryNodeId, sourceAnchorId, normalizeStr, generateEdgeId } from './utils.js'

export async function runSearch(query) {
  query = query.trim()
  if (!query) return

  // Top-level search starts a fresh graph
  resetGraph()
  clearGraph()

  state.queryHistory.push(query)

  const qid = queryNodeId(query)
  const queryNode = makeQueryNode(query)
  state.nodes.set(qid, queryNode)
  addToGraph([queryNode], [])

  emit('search:start', { query })

  const sources = enabledSources()
  const promises = sources.map(source => runSourceQuery(query, source, qid))
  await Promise.allSettled(promises)

  emit('search:done', { query })
}

export async function expandNode(node) {
  if (state.importedMode) return
  if (state.nodes.size >= state.nodeLimit) {
    emit('node-cap:reached')
    return
  }

  const depth = getNodeDepth(node.id)
  if (depth >= 3) {
    emit('depth-limit:reached', { node })
    return
  }

  const expandQuery = node.result?.title || node.label
  node.expanded = true
  emit('node:updated', node)

  const qid = queryNodeId(expandQuery)

  // Reuse existing query node or create new one
  if (!state.nodes.has(qid)) {
    const qNode = makeQueryNode(expandQuery)
    state.nodes.set(qid, qNode)

    const parentEdge = {
      id: generateEdgeId('expand', node.id, qid),
      source: node.id,
      target: qid,
      type: 'query-to-result',
      crossSource: false,
      label: '',
    }
    state.edges.set(parentEdge.id, parentEdge)
    addToGraph([qNode], [parentEdge])
  }

  emit('search:start', { query: expandQuery, expansion: true })

  const sources = enabledSources()
  const promises = sources.map(source => runSourceQuery(expandQuery, source, qid))
  await Promise.allSettled(promises)

  emit('search:done', { query: expandQuery, expansion: true })
}

async function runSourceQuery(query, source, queryNodeId) {
  const t0 = Date.now()
  state.sourceStatuses.set(source.id, { status: 'querying', count: 0, latency: null, proxyUsed: false })
  emit('source:status', { sourceId: source.id, status: 'querying' })

  try {
    const results = await source.searchFn({ query })
    const latency = Date.now() - t0

    const newNodes = []
    const newEdges = []

    // Ensure source anchor exists
    const anchorId = sourceAnchorId(source.id)
    if (!state.nodes.has(anchorId)) {
      const anchor = makeSourceAnchor(source)
      state.nodes.set(anchorId, anchor)
      newNodes.push(anchor)
    }

    for (const result of results) {
      if (state.nodes.size >= state.nodeLimit) {
        emit('node-cap:reached')
        break
      }

      if (state.nodes.has(result.id)) continue

      const node = {
        ...result,
        label: result.title,
        color: source.color,
        pinned: state.collection.has(result.id),
        expanded: false,
        annotation: state.collection.get(result.id)?.annotation || '',
      }

      state.nodes.set(result.id, node)
      newNodes.push(node)

      // query-to-result edge
      const qEdge = {
        id: generateEdgeId('qtr', queryNodeId, result.id),
        source: queryNodeId,
        target: result.id,
        type: 'query-to-result',
        crossSource: false,
        label: '',
      }
      state.edges.set(qEdge.id, qEdge)
      newEdges.push(qEdge)

      // result-to-anchor edge
      const aEdge = {
        id: generateEdgeId('rta', result.id, anchorId),
        source: result.id,
        target: anchorId,
        type: 'result-to-anchor',
        crossSource: false,
        label: '',
      }
      state.edges.set(aEdge.id, aEdge)
      newEdges.push(aEdge)
    }

    // Cross-source edge inference for new nodes
    const inferredEdges = inferCrossSourceEdges(newNodes)
    for (const e of inferredEdges) newEdges.push(e)

    addToGraph(newNodes, newEdges)

    state.sourceStatuses.set(source.id, {
      status: 'done', count: results.length, latency, proxyUsed: false,
    })
    emit('source:status', { sourceId: source.id, status: 'done', count: results.length, latency })
  } catch (err) {
    const latency = Date.now() - t0
    console.warn(`[${source.id}] error:`, err.message)
    state.sourceStatuses.set(source.id, { status: 'error', count: 0, latency, error: err.message })
    emit('source:status', { sourceId: source.id, status: 'error', error: err.message })
  }
}

function inferCrossSourceEdges(newNodes) {
  const edges = []
  const resultNodes = newNodes.filter(n => n.result || (n.rawSubjects || n.rawCreators))

  for (const newNode of resultNodes) {
    const newSubjects = (newNode.rawSubjects || []).map(normalizeStr).filter(Boolean)
    const newCreators = (newNode.rawCreators || []).map(normalizeStr).filter(Boolean)
    if (!newSubjects.length && !newCreators.length) continue

    for (const [existingId, existingNode] of state.nodes) {
      if (existingId === newNode.id) continue
      if (existingNode.type === 'query' || existingNode.type === 'source') continue
      if (!existingNode.rawSubjects && !existingNode.rawCreators) continue

      const exSubjects = (existingNode.rawSubjects || []).map(normalizeStr).filter(Boolean)
      const exCreators = (existingNode.rawCreators || []).map(normalizeStr).filter(Boolean)
      const isCross = newNode.sourceId !== existingNode.sourceId

      for (const subj of newSubjects) {
        if (!exSubjects.includes(subj)) continue
        const id = generateEdgeId('shared-subject', newNode.id, existingId, subj)
        if (state.edges.has(id)) continue
        const edge = {
          id, source: newNode.id, target: existingId,
          type: 'shared-subject', crossSource: isCross, label: subj,
        }
        state.edges.set(id, edge)
        edges.push(edge)
      }

      for (const creator of newCreators) {
        if (!exCreators.includes(creator)) continue
        const id = generateEdgeId('shared-creator', newNode.id, existingId, creator)
        if (state.edges.has(id)) continue
        const edge = {
          id, source: newNode.id, target: existingId,
          type: 'shared-creator', crossSource: isCross, label: creator,
        }
        state.edges.set(id, edge)
        edges.push(edge)
      }
    }
  }

  return edges
}

export function getNodeDepth(nodeId) {
  const queryIds = new Set(
    [...state.nodes.values()].filter(n => n.type === 'query').map(n => n.id)
  )
  if (queryIds.has(nodeId)) return 0

  // Build undirected adjacency from relevant edges
  const adj = new Map()
  const addAdj = (a, b) => {
    if (!adj.has(a)) adj.set(a, [])
    if (!adj.has(b)) adj.set(b, [])
    adj.get(a).push(b)
    adj.get(b).push(a)
  }

  for (const edge of state.edges.values()) {
    const s = typeof edge.source === 'object' ? edge.source.id : edge.source
    const t = typeof edge.target === 'object' ? edge.target.id : edge.target
    if (s && t) addAdj(s, t)
  }

  // Multi-source BFS from all query nodes
  const dist = new Map()
  const queue = []
  for (const qid of queryIds) { dist.set(qid, 0); queue.push(qid) }

  let i = 0
  while (i < queue.length) {
    const cur = queue[i++]
    if (cur === nodeId) return dist.get(cur)
    for (const nb of (adj.get(cur) || [])) {
      if (!dist.has(nb)) {
        dist.set(nb, dist.get(cur) + 1)
        queue.push(nb)
      }
    }
  }

  return dist.has(nodeId) ? dist.get(nodeId) : Infinity
}

export function addUserLink(nodeA, nodeB) {
  const id = generateEdgeId('user-link', nodeA.id, nodeB.id)
  if (state.edges.has(id)) return
  const edge = {
    id, source: nodeA.id, target: nodeB.id,
    type: 'user-link', crossSource: nodeA.sourceId !== nodeB.sourceId, label: '',
  }
  state.edges.set(id, edge)
  addToGraph([], [edge])
}
