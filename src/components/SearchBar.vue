<template>
    <header
        class="text-white absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-surface border border-border rounded-[32px] px-2.5 py-1.5 shadow-panel z-[100] min-w-[480px]"
    >
        <button
            class="bg-transparent border border-border text-text rounded-[20px] py-1 px-2 cursor-pointer text-[14px] transition-colors duration-200 hover:bg-border"
            title="Show collection"
            @click="uiStore.toggleCollectionDrawer()"
        >
            ⊞
        </button>
        <input
            v-model="query"
            type="text"
            class="flex-1 bg-transparent border-none text-bright font-mono text-[14px] outline-none px-1.5 placeholder:text-dim"
            placeholder="Search across libraries…"
            autocomplete="off"
            spellcheck="false"
            @keydown.enter="performSearch"
        />
        <button
            class="bg-accent text-white border border-accent rounded-[20px] py-1 px-3 cursor-pointer text-xs transition-colors duration-200 whitespace-nowrap hover:bg-accent-hover"
            @click="performSearch"
        >
            Search
        </button>
        <button
            class="bg-transparent border border-border text-text rounded-[20px] py-1 px-2 cursor-pointer text-[14px] transition-colors duration-200 hover:bg-border"
            title="Export/Import"
            @click="showExportImport = !showExportImport"
        >
            ≡
        </button>
    </header>

    <!-- Export/Import dropdown -->
    <div
        v-if="showExportImport"
        class="absolute top-16 right-4 bg-surface border border-border rounded-[6px] shadow-panel z-[101] py-1"
    >
        <button
            class="w-full px-3 py-1.5 text-left text-text hover:bg-surface2 text-xs"
            @click="handleExport"
        >
            Export collection
        </button>
        <button
            class="w-full px-3 py-1.5 text-left text-text hover:bg-surface2 text-xs"
            @click="triggerImport"
        >
            Import graph
        </button>
    </div>

    <input
        ref="fileInput"
        type="file"
        accept=".json"
        style="display: none"
        @change="handleImport"
    />
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useUIStore } from "../stores/ui";
import { debounce } from "../utils";
import { runSearch } from "../services/search";
import { exportCollection, importGraph } from "../services/collection";

const uiStore = useUIStore();
const query = ref<string>("");
const showExportImport = ref<boolean>(false);
const fileInput = ref<HTMLInputElement | null>(null);

const performSearch = debounce(async (): Promise<void> => {
    if (query.value.trim()) {
        await runSearch(query.value);
    }
}, 300);

const handleExport = (): void => {
    exportCollection();
    showExportImport.value = false;
};

const triggerImport = (): void => {
    fileInput.value?.click();
    showExportImport.value = false;
};

const handleImport = (e: Event): void => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>): void => {
        try {
            const data = JSON.parse(event.target?.result as string);
            importGraph(data);
            query.value = "";
        } catch (err) {
            alert(
                "Failed to parse file: " + (err instanceof Error ? err.message : "Unknown error"),
            );
        }
    };
    reader.readAsText(file);
};
</script>
