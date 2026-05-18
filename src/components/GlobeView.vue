<template>
  <div ref="container" class="absolute inset-0"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { initMap, handleSourceStatusChange, cleanup } from '../mapview'
import { useSourcesStore } from '../stores/sources'

const container = ref<HTMLElement | null>(null)
const sourcesStore = useSourcesStore()

onMounted(async (): Promise<void> => {
  if (container.value) {
    await nextTick()
    initMap(container.value)

    watch(
      () => sourcesStore.statuses,
      (statuses: Map<string, any>): void => {
        for (const [sourceId, statusData] of statuses) {
          handleSourceStatusChange(sourceId, statusData.status)
        }
      },
      { deep: true }
    )
  }
})

onUnmounted((): void => {
  cleanup()
})
</script>
