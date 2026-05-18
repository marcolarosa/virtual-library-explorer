<template>
  <aside
    class="absolute top-0 bottom-0 w-1/2 bg-surface border border-border border-l-0 rounded-r-md flex flex-col transition-transform duration-200 ease-in-out z-[200] overflow-hidden left-0"
    :class="{ '-translate-x-full': !uiStore.collectionDrawerOpen }"
  >
    <div class="flex items-center justify-between px-3.5 py-3 border-b border-border font-semibold text-bright shrink-0">
      <span>Collection ({{ collectionStore.items.size }})</span>
      <button
        class="bg-transparent border-none text-dim cursor-pointer text-[18px] px-1 hover:text-bright"
        @click="uiStore.collectionDrawerOpen = false"
      >
        ×
      </button>
    </div>
    <div class="flex-1 overflow-y-auto py-2">
      <div v-if="collectionStore.items.size === 0" class="px-3 py-4 text-dim text-xs">
        No pinned items yet
      </div>
      <template v-else>
        <div
          v-for="(item, nodeId) of collectionStore.items"
          :key="nodeId"
          class="px-2 py-2 border-b border-border text-xs"
        >
          <div class="flex items-center gap-2 mb-1">
            <span
              class="w-2 h-2 rounded-full flex-shrink-0"
              :style="{ backgroundColor: getSourceColor(item.sourceId) }"
            ></span>
            <span
              class="text-bright font-semibold truncate flex-1 cursor-pointer hover:text-accent"
              @click="selectNode(nodeId)"
            >
              {{ item.label }}
            </span>
            <button
              class="bg-transparent border-none text-dim text-[12px] cursor-pointer hover:text-bright"
              @click="unpinNode(nodeId)"
              title="Unpin"
            >
              ✕
            </button>
          </div>
          <textarea
            :value="item.annotation"
            class="w-full bg-surface2 border border-border rounded text-[11px] p-1 text-text focus:outline-none focus:border-accent resize-none"
            rows="2"
            placeholder="Add note…"
            @input="(e) => setAnnotation(nodeId, e.target.value)"
          ></textarea>
        </div>
      </template>
    </div>
    <div class="py-2.5 px-3.5 border-t border-border shrink-0">
      <button
        class="w-full py-2 bg-surface2 border border-border text-text rounded-[6px] cursor-pointer hover:bg-border text-xs"
        @click="handleExport"
      >
        Export collection JSON
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useUIStore } from '../stores/ui'
import { useCollectionStore } from '../stores/collection'
import { useGraphStore } from '../stores/graph'
import { getSource } from '../sources'
import { unpinNode, setAnnotation, exportCollection } from '../services/collection'

const uiStore = useUIStore()
const collectionStore = useCollectionStore()
const graphStore = useGraphStore()

const getSourceColor = (sourceId: string): string => {
  const source = getSource(sourceId)
  return source?.color || '#888888'
}

const selectNode = (nodeId: string): void => {
  const node = graphStore.nodes.get(nodeId)
  if (node) {
    uiStore.selectNode(node)
  }
}

const handleExport = (): void => {
  exportCollection()
}
</script>
