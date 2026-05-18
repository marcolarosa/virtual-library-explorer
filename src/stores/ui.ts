import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUIStore = defineStore('ui', () => {
  const selectedLocationId = ref<string | null>(null)
  const selectedResultId = ref<string | null>(null)
  const collectionDrawerOpen = ref<boolean>(false)
  const searchInProgress = ref<boolean>(false)

  function selectLocation(locationId: string): void {
    selectedLocationId.value = locationId
    selectedResultId.value = null
  }

  function selectResult(resultId: string): void {
    selectedResultId.value = resultId
  }

  function clearSelection(): void {
    selectedLocationId.value = null
    selectedResultId.value = null
  }

  function toggleCollectionDrawer(): void {
    collectionDrawerOpen.value = !collectionDrawerOpen.value
  }

  return {
    selectedLocationId,
    selectedResultId,
    collectionDrawerOpen,
    searchInProgress,
    selectLocation,
    selectResult,
    clearSelection,
    toggleCollectionDrawer,
  }
})
