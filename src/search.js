import { state, resetGraph } from './state.js'
import { emit } from './bus.js'
import { enabledSources } from './sources.js'
import { queryNodeId } from './utils.js'

function makeQueryNode(queryStr) {
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
    depth: 0,
  }
}

export async function runSearch(query) {
  query = query.trim()
  if (!query) return

  // Top-level search starts a fresh graph
  resetGraph()

  state.queryHistory.push(query)

  const qid = queryNodeId(query)
  const queryNode = makeQueryNode(query)
  state.nodes.set(qid, queryNode)

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

  const depth = node.depth ?? 0
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
    qNode.depth = (node.depth ?? 0) + 1
    state.nodes.set(qid, qNode)
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
    const { docs, total } = await source.searchFn({ query })
    const latency = Date.now() - t0

    const queryDepth = state.nodes.get(queryNodeId)?.depth ?? 0

    for (const result of docs) {
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
        depth: queryDepth + 1,
      }

      state.nodes.set(result.id, node)
    }

    emit('graph:update', { sourceId: source.id })

    state.sourceStatuses.set(source.id, {
      status: 'done', count: total, latency, proxyUsed: false,
    })
    emit('source:status', { sourceId: source.id, status: 'done', count: total, latency })
  } catch (err) {
    const latency = Date.now() - t0
    console.warn(`[${source.id}] error:`, err.message)
    state.sourceStatuses.set(source.id, { status: 'error', count: 0, latency, error: err.message })
    emit('source:status', { sourceId: source.id, status: 'error', error: err.message })
  }
}

export function getNodeDepth(nodeId) {
  return state.nodes.get(nodeId)?.depth ?? Infinity
}
