import { useCollectionStore, type CollectionItem } from '../stores/collection'
import { useLocationsStore, type SearchResult } from '../stores/locations'
import { SOURCES, getSource } from '../sources'

export function pinResult(result: SearchResult, sourceId: string): void {
  const collectionStore = useCollectionStore()

  if (collectionStore.items.has(result.id)) return

  collectionStore.pinNode(result.id, {
    id: result.id,
    label: result.title,
    type: result.type,
    sourceId,
    annotation: '',
    result,
  })
}

export function unpinNode(resultId: string): void {
  const collectionStore = useCollectionStore()

  if (!collectionStore.items.has(resultId)) return

  collectionStore.unpinNode(resultId)
}

export function setAnnotation(resultId: string, text: string): void {
  const collectionStore = useCollectionStore()

  const entry = collectionStore.items.get(resultId)
  if (!entry) return

  collectionStore.setAnnotation(resultId, text)
}

export function exportCollection(): void {
  const collectionStore = useCollectionStore()

  const items: any[] = []
  const sourceIds = new Set<string>()

  for (const [resultId, entry] of collectionStore.items) {
    sourceIds.add(entry.sourceId)
    items.push({
      id: resultId,
      title: entry.label,
      type: entry.type || 'work',
      sourceId: entry.sourceId,
      annotation: entry.annotation,
      result: entry.result,
    })
  }

  const sources = SOURCES
    .filter(s => sourceIds.has(s.id))
    .map(s => ({ id: s.id, label: s.label }))

  const payload = {
    version: '2.0',
    meta: {
      created: new Date().toISOString(),
      description: '',
    },
    sources,
    items,
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `library-collection-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function importCollection(data: any): void {
  const collectionStore = useCollectionStore()

  if (!data.items && !data.nodes) {
    alert('Not a valid library collection file.')
    return
  }

  collectionStore.clear()

  const items = data.items || data.nodes || []
  for (const item of items) {
    collectionStore.pinNode(item.id, {
      id: item.id,
      label: item.title || item.label,
      type: item.type || 'work',
      sourceId: item.sourceId,
      annotation: item.annotation || '',
      result: item.result || null,
    })
  }
}
