import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'

export interface Node {
  id: string
  label: string
  type: string
  sourceId: string
  color: string
  result?: any
  pinned?: boolean
  expanded?: boolean
  annotation?: string
  depth?: number
}

export const useGraphStore = defineStore('graph', () => {
  const nodes = ref<Map<string, Node>>(new Map())
  const queryHistory = ref<string[]>([])
  const importedMode = ref<boolean>(false)
  const nodeLimit = 500
  const labelsVisible = ref<boolean>(true)
  const filters = reactive<{
    hiddenSources: Set<string>
    hiddenTypes: Set<string>
  }>({
    hiddenSources: new Set(),
    hiddenTypes: new Set(),
  })

  function addNode(node: Node): void {
    nodes.value.set(node.id, node)
  }

  function removeNode(nodeId: string): void {
    nodes.value.delete(nodeId)
  }

  function setNode(nodeId: string, updates: Partial<Node>): void {
    const node = nodes.value.get(nodeId)
    if (node) {
      Object.assign(node, updates)
    }
  }

  function clearGraph(): void {
    nodes.value.clear()
    importedMode.value = false
  }

  function resetGraph(): void {
    clearGraph()
    queryHistory.value = []
  }

  function addToQueryHistory(query: string): void {
    if (!queryHistory.value.includes(query)) {
      queryHistory.value.push(query)
    }
  }

  return {
    nodes,
    queryHistory,
    importedMode,
    nodeLimit,
    labelsVisible,
    filters,
    addNode,
    removeNode,
    setNode,
    clearGraph,
    resetGraph,
    addToQueryHistory,
  }
})
