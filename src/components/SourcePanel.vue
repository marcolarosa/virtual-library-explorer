<template>
    <div
        class="text-white absolute top-4 right-4 bg-surface border border-border rounded-[6px] shadow-panel z-[100] min-w-[200px]"
    >
        <div
            class="flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-[1px] text-text"
        >
            Sources
            <button
                class="bg-transparent border-none cursor-pointer text-[14px]"
                @click="collapsed = !collapsed"
            >
                {{ collapsed ? "+" : "−" }}
            </button>
        </div>
        <div v-if="!collapsed" class="pt-1 pb-2">
            <div
                v-for="source in enabledSources()"
                :key="source.id"
                class="px-2 py-1.5 text-xs flex items-center justify-between hover:bg-surface2 cursor-pointer transition-colors"
                @click="focusSource(source.id)"
            >
                <span class="flex items-center gap-2 flex-1">
                    <span
                        class="w-2 h-2 rounded-full flex-shrink-0"
                        :style="{ backgroundColor: source.color }"
                    ></span>
                    <span class="truncate">{{ source.shortLabel }}</span>
                </span>
                <span
                    v-if="getStatus(source.id).status === 'querying'"
                    class="text-dim animate-blink"
                >
                    ⊙
                </span>
                <span v-else-if="getStatus(source.id).count > 0" class="text-bright">
                    {{ getStatus(source.id).count }}
                </span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { enabledSources } from "../sources";
import { useSourcesStore } from "../stores/sources";
import { focusSource } from "../mapview";

const sourcesStore = useSourcesStore();
const collapsed = ref<boolean>(false);

const getStatus = (sourceId: string) => sourcesStore.getStatus(sourceId);
</script>
