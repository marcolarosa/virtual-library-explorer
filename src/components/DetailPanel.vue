<template>
    <aside
        class="bg-white absolute top-0 bottom-0 w-[320px] bg-surface border border-border border-r-0 rounded-l-md flex flex-col transition-transform duration-200 ease-in-out z-[200] right-0"
        :class="{ 'translate-x-full': !uiStore.detailPanelOpen }"
    >
        <div v-if="uiStore.selectedNode" class="flex flex-col h-full">
            <!-- Header -->
            <div class="flex items-center gap-2 px-3 py-2.5 border-b border-border shrink-0">
                <span
                    v-if="uiStore.selectedNode.sourceId !== 'query'"
                    class="w-2 h-2 rounded-full flex-shrink-0"
                    :style="{ backgroundColor: uiStore.selectedNode.color }"
                ></span>
                <span class="text-sm font-semibold flex-1 truncate min-w-0">
                    {{ uiStore.selectedNode.label }}
                </span>
                <Button
                    icon="pi pi-times"
                    rounded
                    text
                    severity="secondary"
                    @click="uiStore.clearSelection()"
                />
            </div>

            <!-- Content -->
            <div class="flex-1 overflow-y-auto p-4 space-y-3">
                <!-- Type and source -->
                <div v-if="uiStore.selectedNode.result" class="text-xs text-dim space-y-1">
                    <div v-if="uiStore.selectedNode.type">
                        <span class="text-text font-semibold">Type:</span>
                        {{ uiStore.selectedNode.type }}
                    </div>
                    <div v-if="uiStore.selectedNode.sourceId !== 'query'">
                        <span class="text-text font-semibold">Source:</span>
                        {{ getSourceLabel(uiStore.selectedNode.sourceId) }}
                    </div>
                </div>

                <!-- Description -->
                <div v-if="uiStore.selectedNode.result?.description" class="text-xs text-text">
                    <p class="font-semibold mb-1 text-bright">Description</p>
                    <p>{{ truncate(uiStore.selectedNode.result.description, 200) }}</p>
                </div>

                <!-- Date -->
                <div v-if="uiStore.selectedNode.result?.date" class="text-xs text-dim">
                    <span class="text-text font-semibold">Date:</span>
                    {{ uiStore.selectedNode.result.date }}
                </div>

                <!-- Creators -->
                <div v-if="uiStore.selectedNode.result?.creators?.length" class="text-xs">
                    <p class="font-semibold mb-1 text-bright">Creators</p>
                    <div class="flex flex-wrap gap-1">
                        <Tag
                            v-for="(creator, idx) of uiStore.selectedNode.result.creators"
                            :key="idx"
                            :value="creator"
                            severity="secondary"
                            @click="searchTag(creator)"
                            class="cursor-pointer"
                        />
                    </div>
                </div>

                <!-- Subjects -->
                <div v-if="uiStore.selectedNode.result?.subjects?.length" class="text-xs">
                    <p class="font-semibold mb-1 text-bright">Subjects</p>
                    <div class="flex flex-wrap gap-1">
                        <Tag
                            v-for="(subject, idx) of uiStore.selectedNode.result.subjects"
                            :key="idx"
                            :value="subject"
                            severity="secondary"
                            @click="searchTag(subject)"
                            class="cursor-pointer"
                        />
                    </div>
                </div>

                <!-- URL -->
                <div v-if="uiStore.selectedNode.result?.url" class="text-xs">
                    <Button
                        label="View source"
                        icon="pi pi-arrow-right"
                        icon-pos="right"
                        class="w-full"
                        @click="openInIframe(uiStore.selectedNode.result.url)"
                    />
                </div>
            </div>

            <!-- Footer actions -->
            <div class="px-3 py-2.5 border-t border-border shrink-0 space-y-2">
                <Button
                    v-if="uiStore.selectedNode.sourceId !== 'query' && !graphStore.importedMode"
                    :label="uiStore.selectedNode.pinned ? 'Pinned · Expand' : 'Expand'"
                    class="w-full"
                    :disabled="cannotExpand"
                    @click="expandNode(uiStore.selectedNode)"
                />
                <Button
                    :label="uiStore.selectedNode.pinned ? '★ Pinned' : '☆ Pin'"
                    class="w-full"
                    :severity="uiStore.selectedNode.pinned ? 'warning' : 'secondary'"
                    @click="togglePin(uiStore.selectedNode)"
                />
            </div>
        </div>
    </aside>
</template>

<script setup lang="ts">
import { computed } from "vue";
import Button from "primevue/button";
import Tag from "primevue/tag";
import { useUIStore } from "../stores/ui";
import { useGraphStore } from "../stores/graph";
import { getSource } from "../sources";
import { truncate } from "../utils";
import { expandNode } from "../services/search";
import { pinNode, unpinNode } from "../services/collection";
import { runSearch } from "../services/search";

const uiStore = useUIStore();
const graphStore = useGraphStore();

const getSourceLabel = (sourceId: string): string => {
    const source = getSource(sourceId);
    return source?.label || sourceId;
};

const cannotExpand = computed<boolean>(
    () =>
        (uiStore.selectedNode?.depth ?? 0) >= 3 ||
        graphStore.importedMode ||
        graphStore.nodes.size >= graphStore.nodeLimit,
);

const togglePin = (node: any): void => {
    if (node.pinned) {
        unpinNode(node.id);
        graphStore.setNode(node.id, { pinned: false });
    } else {
        pinNode(node);
        graphStore.setNode(node.id, { pinned: true });
    }
};

const searchTag = async (tag: string): Promise<void> => {
    await runSearch(tag);
    uiStore.clearSelection();
};

const openInIframe = (url: string): void => {
    uiStore.openIframePanel(url, uiStore.selectedNode?.label || "Source");
};
</script>
