<template>
    <Drawer
        v-model:visible="drawerVisible"
        position="left"
        :modal="false"
        panel-class="bg-surface border border-border border-l-0 rounded-r-md flex"
        :style="{ width: '80vw' }"
    >
        <template #header v-if="selectedLocation">
            <div class="flex items-center gap-2 flex-1">
                <span class="text-sm font-semibold flex-1 truncate min-w-0">
                    {{ selectedLocation.label }}
                </span>
                <span class="text-xs text-dim">
                    {{ selectedLocation.results.length }} results
                </span>
            </div>
        </template>

        <div v-if="selectedLocation" class="flex gap-4 h-full w-full">
            <!-- Results List Column -->
            <div class="w-1/3 overflow-y-auto">
                <div
                    v-if="selectedLocation.results.length === 0"
                    class="text-center text-dim text-sm py-8"
                >
                    No results available
                </div>
                <div
                    v-for="result in selectedLocation.results"
                    :key="result.id"
                    class="mb-4 cursor-pointer hover:bg-surface-bright p-2 rounded transition"
                    :class="{ 'border-2 border-accent': selectedResultId === result.id }"
                    @click="selectResult(result)"
                >
                    <!-- Title -->
                    <div class="font-semibold text-sm text-bright mb-1 line-clamp-2">
                        {{ result.title }}
                    </div>

                    <!-- Type -->
                    <div v-if="result.type" class="text-xs text-dim mb-2">
                        {{ result.type }}
                    </div>

                    <!-- Image -->
                    <div v-if="result.image" class="mb-2">
                        <img
                            :src="result.image"
                            :alt="result.title"
                            class="w-full h-24 object-cover rounded"
                        />
                    </div>
                </div>
            </div>

            <!-- Iframe Column -->
            <div class="w-2/3 border-l pl-4">
                <div
                    v-if="!selectedResultId"
                    class="h-full flex items-center justify-center text-dim text-sm"
                >
                    Select a result to view
                </div>
                <iframe
                    v-else
                    :src="selectedResult?.url"
                    class="w-full h-full border-0 rounded"
                    :title="selectedResult?.title"
                />
            </div>
        </div>
    </Drawer>
</template>

<script setup lang="ts">
import { computed } from "vue";
import Drawer from "primevue/drawer";
import { useUIStore } from "../stores/ui";
import { useLocationsStore } from "../stores/locations";

const uiStore = useUIStore();
const locationsStore = useLocationsStore();

const drawerVisible = computed({
    get: () => uiStore.selectedLocationId !== null,
    set: (val: boolean) => {
        if (!val) uiStore.clearSelection();
    },
});

const selectedLocation = computed(() => {
    if (!uiStore.selectedLocationId) return null;
    return locationsStore.locations.get(uiStore.selectedLocationId) || null;
});

const selectedResult = computed(() => {
    if (!uiStore.selectedResultId || !selectedLocation.value) return null;
    return selectedLocation.value.results.find((r) => r.id === uiStore.selectedResultId) || null;
});

const selectedResultId = computed(() => uiStore.selectedResultId);

function selectResult(result: any) {
    uiStore.selectResult(result.id);
}
</script>
