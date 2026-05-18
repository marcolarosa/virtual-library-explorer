<template>
  <Drawer
    v-model:visible="uiStore.collectionDrawerOpen"
    position="left"
    :modal="false"
    panel-class="bg-surface border border-border border-l-0 rounded-r-md"
    :style="{ width: '50vw' }"
  >
    <template #header>
      <span class="font-semibold text-bright">Collection ({{ collectionStore.items.size }})</span>
    </template>

    <div class="flex flex-col h-full gap-4">
      <div v-if="collectionStore.items.size === 0" class="text-dim text-xs">
        No pinned items yet
      </div>
      <template v-else>
        <div class="space-y-2 flex-1 overflow-y-auto">
          <div
            v-for="(item, nodeId) of collectionStore.items"
            :key="nodeId"
            class="border border-border rounded p-2 text-xs"
          >
            <div class="flex items-center gap-2 mb-2">
              <span
                class="w-2 h-2 rounded-full flex-shrink-0"
                :style="{ backgroundColor: getSourceColor(item.sourceId) }"
              ></span>
              <span
                class="text-bright font-semibold truncate flex-1 cursor-pointer hover:text-accent"
                @click="selectCollectionItem(item, nodeId)"
              >
                {{ item.label }}
              </span>
              <Button
                icon="pi pi-times"
                rounded
                text
                severity="secondary"
                size="small"
                @click="unpinNode(nodeId)"
              />
            </div>
            <Textarea
              :model-value="item.annotation"
              class="w-full text-[11px]"
              rows="2"
              placeholder="Add note…"
              @update:model-value="(v) => setAnnotation(nodeId, v)"
            />
          </div>
        </div>
      </template>
      <Button
        label="Export collection JSON"
        class="w-full mt-auto"
        @click="handleExport"
      />
    </div>
  </Drawer>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import Textarea from 'primevue/textarea'
import Drawer from 'primevue/drawer'
import { useUIStore } from '../stores/ui'
import { useCollectionStore } from '../stores/collection'
import { getSource } from '../sources'
import { unpinNode, setAnnotation, exportCollection } from '../services/collection'

const uiStore = useUIStore()
const collectionStore = useCollectionStore()

const getSourceColor = (sourceId: string): string => {
  const source = getSource(sourceId)
  return source?.color || '#888888'
}

const selectCollectionItem = (item: any, itemId: string): void => {
  uiStore.selectLocation(item.sourceId)
  uiStore.selectResult(itemId)
}

const handleExport = (): void => {
  exportCollection()
}
</script>
