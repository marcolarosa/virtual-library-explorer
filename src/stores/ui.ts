import { defineStore } from 'pinia'
import { ref } from 'vue'

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

export const useUIStore = defineStore('ui', () => {
  const selectedNode = ref<Node | null>(null)
  const collectionDrawerOpen = ref<boolean>(false)
  const detailPanelOpen = ref<boolean>(false)
  const iframePanelOpen = ref<boolean>(false)
  const iframeUrl = ref<string | null>(null)
  const iframeTitle = ref<string>('')
  const panelMode = ref<'detail' | 'collection'>('detail')
  const nodeCapWarningVisible = ref<boolean>(false)
  const searchInProgress = ref<boolean>(false)
  const lastSourceId = ref<string | null>(null)

  function selectNode(node: Node): void {
    selectedNode.value = node
    detailPanelOpen.value = true
  }

  function clearSelection(): void {
    selectedNode.value = null
    detailPanelOpen.value = false
  }

  function openIframePanel(url: string, title: string): void {
    iframeUrl.value = url
    iframeTitle.value = title
    iframePanelOpen.value = true
    collectionDrawerOpen.value = false
  }

  function closeIframePanel(): void {
    iframePanelOpen.value = false
    iframeUrl.value = null
  }

  function toggleCollectionDrawer(): void {
    collectionDrawerOpen.value = !collectionDrawerOpen.value
    if (collectionDrawerOpen.value) {
      iframePanelOpen.value = false
    }
  }

  return {
    selectedNode,
    collectionDrawerOpen,
    detailPanelOpen,
    iframePanelOpen,
    iframeUrl,
    iframeTitle,
    panelMode,
    nodeCapWarningVisible,
    searchInProgress,
    lastSourceId,
    selectNode,
    clearSelection,
    openIframePanel,
    closeIframePanel,
    toggleCollectionDrawer,
  }
})
