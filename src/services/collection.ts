import { useGraphStore, type Node } from '../stores/graph'
import { useCollectionStore, type CollectionItem } from '../stores/collection'
import { SOURCES, getSource } from '../sources'

export function pinNode(node: Node): void {
  const collectionStore = useCollectionStore()
  const graphStore = useGraphStore()

  if (collectionStore.items.has(node.id)) return

  collectionStore.pinNode(node.id, node)
  graphStore.setNode(node.id, { pinned: true })
}

export function unpinNode(nodeId: string): void {
  const collectionStore = useCollectionStore()
  const graphStore = useGraphStore()

  if (!collectionStore.items.has(nodeId)) return

  collectionStore.unpinNode(nodeId)
  const node = graphStore.nodes.get(nodeId)
  if (node) {
    graphStore.setNode(nodeId, { pinned: false })
  }
}

export function setAnnotation(nodeId: string, text: string): void {
  const collectionStore = useCollectionStore()
  const graphStore = useGraphStore()

  const entry = collectionStore.items.get(nodeId)
  if (!entry) return

  collectionStore.setAnnotation(nodeId, text)
  const node = graphStore.nodes.get(nodeId)
  if (node) {
    graphStore.setNode(nodeId, { annotation: text })
  }
}

export function exportCollection(): void {
  const collectionStore = useCollectionStore()
  const graphStore = useGraphStore()

  const nodes: any[] = []
  const sourceIds = new Set<string>()

  for (const [nodeId, entry] of collectionStore.items) {
    sourceIds.add(entry.sourceId)
    nodes.push({
      id: nodeId,
      label: entry.label,
      type: entry.type || 'work',
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
      query_history: [...graphStore.queryHistory],
      description: '',
    },
    sources,
    nodes,
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `library-graph-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function importGraph(data: any): void {
  const graphStore = useGraphStore()
  const collectionStore = useCollectionStore()

  if (!data.nodes) {
    alert('Not a valid library graph file.')
    return
  }

  graphStore.resetGraph()
  collectionStore.clear()
  graphStore.importedMode = true
  graphStore.queryHistory = data.meta?.query_history || []

  const sourceColors: Record<string, string> = {}
  for (const s of (data.sources || [])) sourceColors[s.id] = s.color

  for (const n of data.nodes) {
    const color = sourceColors[n.sourceId] || getSource(n.sourceId)?.color || '#888888'

    const node: Node = {
      id: n.id,
      label: n.label,
      type: n.type || 'work',
      sourceId: n.sourceId,
      color,
      result: n.result || null,
      pinned: collectionStore.items.has(n.id),
      expanded: false,
      annotation: n.annotation || '',
    }
    graphStore.addNode(node)
  }
}
