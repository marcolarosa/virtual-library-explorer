import { useGraphStore, type Node } from '../stores/graph'
import { useSourcesStore } from '../stores/sources'
import { useCollectionStore } from '../stores/collection'
import { useUIStore } from '../stores/ui'
import { enabledSources } from '../sources'
import { queryNodeId } from '../utils'

function makeQueryNode(queryStr: string): Node {
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

export async function runSearch(query: string): Promise<void> {
  const graphStore = useGraphStore()
  const sourcesStore = useSourcesStore()
  const uiStore = useUIStore()

  query = query.trim()
  if (!query) return

  graphStore.resetGraph()
  graphStore.addToQueryHistory(query)

  const qid = queryNodeId(query)
  const queryNode = makeQueryNode(query)
  graphStore.addNode(queryNode)

  uiStore.searchInProgress = true

  const sources = enabledSources()
  const promises = sources.map(source => runSourceQuery(query, source, qid))
  await Promise.allSettled(promises)

  uiStore.searchInProgress = false
}

export async function expandNode(node: Node): Promise<void> {
  const graphStore = useGraphStore()
  const uiStore = useUIStore()
  const sourcesStore = useSourcesStore()

  if (graphStore.importedMode) return
  if (graphStore.nodes.size >= graphStore.nodeLimit) {
    uiStore.nodeCapWarningVisible = true
    return
  }

  const depth = node.depth ?? 0
  if (depth >= 3) {
    return
  }

  const expandQuery = node.result?.title || node.label
  graphStore.setNode(node.id, { expanded: true })

  const qid = queryNodeId(expandQuery)

  if (!graphStore.nodes.has(qid)) {
    const qNode = makeQueryNode(expandQuery)
    qNode.depth = (node.depth ?? 0) + 1
    graphStore.addNode(qNode)
  }

  uiStore.searchInProgress = true

  const sources = enabledSources()
  const promises = sources.map(source => runSourceQuery(expandQuery, source, qid))
  await Promise.allSettled(promises)

  uiStore.searchInProgress = false
}

async function runSourceQuery(query: string, source: any, queryNodeId: string): Promise<void> {
  const graphStore = useGraphStore()
  const sourcesStore = useSourcesStore()
  const collectionStore = useCollectionStore()
  const uiStore = useUIStore()

  const t0 = Date.now()
  sourcesStore.setStatus(source.id, { status: 'querying', count: 0, latency: null, proxyUsed: false })

  try {
    const { docs, total } = await source.searchFn({ query })
    const latency = Date.now() - t0

    const queryDepth = graphStore.nodes.get(queryNodeId)?.depth ?? 0

    for (const result of docs) {
      if (graphStore.nodes.size >= graphStore.nodeLimit) {
        uiStore.nodeCapWarningVisible = true
        break
      }

      if (graphStore.nodes.has(result.id)) continue

      const node: Node = {
        ...result,
        label: result.title,
        color: source.color,
        pinned: collectionStore.items.has(result.id),
        expanded: false,
        annotation: collectionStore.items.get(result.id)?.annotation || '',
        depth: queryDepth + 1,
      }

      graphStore.addNode(node)
    }

    sourcesStore.setStatus(source.id, {
      status: 'done',
      count: total,
      latency,
      proxyUsed: false,
    })
  } catch (err) {
    const latency = Date.now() - t0
    console.warn(`[${source.id}] error:`, err instanceof Error ? err.message : 'Unknown error')
    sourcesStore.setStatus(source.id, { status: 'error', count: 0, latency, error: err instanceof Error ? err.message : 'Unknown error' })
  }
}

export function getNodeDepth(nodeId: string): number {
  const graphStore = useGraphStore()
  return graphStore.nodes.get(nodeId)?.depth ?? Infinity
}
