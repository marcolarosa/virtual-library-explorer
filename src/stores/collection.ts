import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STORAGE_KEY = 'library-explorer:collection'

export interface CollectionItem {
  annotation: string
  pinnedAt: string
  label: string
  sourceId: string
  type: string
  result?: any
}

function saveToStorage(items: Map<string, CollectionItem>): void {
  try {
    const serialized = {
      version: '1.0',
      meta: { created: new Date().toISOString() },
      collection: Array.from(items.entries()).reduce((acc, [nodeId, item]) => {
        acc[nodeId] = {
          annotation: item.annotation,
          pinnedAt: item.pinnedAt,
          label: item.label,
          sourceId: item.sourceId,
          type: item.type,
          result: item.result,
        }
        return acc
      }, {} as Record<string, any>),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized))
  } catch (e) {
    console.error('Failed to save collection:', e)
  }
}

function loadFromStorage(): Map<string, CollectionItem> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return new Map()
    const data = JSON.parse(stored)
    const items = new Map<string, CollectionItem>()
    Object.entries(data.collection || {}).forEach(([nodeId, item]) => {
      items.set(nodeId, item as CollectionItem)
    })
    return items
  } catch (e) {
    console.error('Failed to load collection:', e)
    return new Map()
  }
}

export const useCollectionStore = defineStore('collection', () => {
  const items = ref<Map<string, CollectionItem>>(new Map())

  watch(items, () => saveToStorage(items.value), { deep: true })

  function load(): void {
    items.value = loadFromStorage()
  }

  function pinNode(nodeId: string, nodeData: any): void {
    items.value.set(nodeId, {
      annotation: '',
      pinnedAt: new Date().toISOString(),
      label: nodeData.label,
      sourceId: nodeData.sourceId,
      type: nodeData.type,
      result: nodeData.result,
    })
  }

  function unpinNode(nodeId: string): void {
    items.value.delete(nodeId)
  }

  function setAnnotation(nodeId: string, text: string): void {
    const item = items.value.get(nodeId)
    if (item) {
      item.annotation = text
    }
  }

  function clear(): void {
    items.value.clear()
  }

  return { items, load, pinNode, unpinNode, setAnnotation, clear }
})
