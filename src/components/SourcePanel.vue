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
            <template v-for="(regionSources, region) in groupedSources" :key="region">
                <div class="px-2 py-1.5 text-[10px] font-bold uppercase text-dim tracking-wider">
                    {{ region }}
                </div>
                <div
                    v-for="source in regionSources"
                    :key="source.id"
                    class="px-4 py-1.5 text-xs flex items-center justify-between hover:bg-surface2 cursor-pointer transition-colors"
                    :class="{
                        'opacity-50': isSourceInactive(source.id),
                    }"
                    @click="focusSource(source.id)"
                >
                    <span class="flex items-center gap-2 flex-1">
                        <span
                            class="w-2 h-2 rounded-full flex-shrink-0"
                            :style="{ backgroundColor: getRegionColor(source.region) }"
                        ></span>
                        <span
                            class="truncate"
                            :class="{ 'line-through': getStatus(source.id).status === 'error' }"
                        >
                            {{ source.label }}
                        </span>
                    </span>
                    <span
                        v-if="getStatus(source.id).status === 'querying'"
                        class="text-dim animate-blink"
                    >
                        ⊙
                    </span>
                    <span
                        v-else-if="getStatus(source.id).status === 'error'"
                        class="text-red-500 font-semibold"
                    >
                        error
                    </span>
                    <span
                        v-else-if="getStatus(source.id).status === 'done'"
                        :class="{ 'text-bright': getStatus(source.id).count > 0 }"
                    >
                        {{ getStatus(source.id).count }}
                    </span>
                </div>
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { enabledSources, getRegionColor } from "../sources";
import { useSourcesStore } from "../stores/sources";
import { focusSource } from "../mapview";

const sourcesStore = useSourcesStore();
const collapsed = ref<boolean>(false);

const getStatus = (sourceId: string) => sourcesStore.getStatus(sourceId);

const isSourceInactive = (sourceId: string) => {
    const status = getStatus(sourceId);
    return status.status === 'error' || (status.status === 'done' && status.count === 0);
};

const groupedSources = computed(() => {
    const groups: Record<string, any[]> = {};

    enabledSources().forEach((source) => {
        if (!groups[source.region]) {
            groups[source.region] = [];
        }
        groups[source.region].push(source);
    });

    // Sort regions in a logical order and sort sources within each region alphabetically
    const regionOrder = ["Americas", "Europe", "Oceania", "Africa", "Asia"];
    const sorted: Record<string, any[]> = {};

    regionOrder.forEach((region) => {
        if (groups[region]) {
            sorted[region] = groups[region].sort((a, b) =>
                a.label.localeCompare(b.label)
            );
        }
    });

    return sorted;
});
</script>
