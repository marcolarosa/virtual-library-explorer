<template>
  <aside
    v-if="uiStore.iframePanelOpen"
    class="absolute top-0 bottom-0 w-1/2 bg-surface border border-border border-r-0 rounded-r-md flex flex-col transition-transform duration-200 ease-in-out z-[200] left-0"
  >
    <div class="flex items-center justify-between px-3 py-2.5 border-b border-border shrink-0">
      <span class="text-sm font-semibold text-text flex-1 truncate">{{ uiStore.iframeTitle }}</span>
      <button
        class="bg-transparent border-none text-dim cursor-pointer text-xl leading-none hover:text-bright"
        @click="uiStore.closeIframePanel()"
      >
        ×
      </button>
    </div>
    <iframe
      v-if="uiStore.iframeUrl"
      :src="uiStore.iframeUrl"
      class="flex-1 border-0 w-full"
      allow="autoplay"
      title="Source content viewer"
    ></iframe>
  </aside>
</template>

<script setup lang="ts">
import { useUIStore } from '../stores/ui'

const uiStore = useUIStore()
</script>
