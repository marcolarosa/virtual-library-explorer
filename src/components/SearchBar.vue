<template>
    <header
        class="text-white absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-surface border border-border rounded-[32px] px-2.5 py-1.5 shadow-panel z-[100] min-w-[480px]"
    >
        <Button
            icon="pi pi-folder"
            rounded
            text
            severity="secondary"
            title="Show collection"
            @click="uiStore.toggleCollectionDrawer()"
        />
        <InputText
            v-model="query"
            type="text"
            class="flex-1"
            placeholder="Search across libraries…"
            autocomplete="off"
            spellcheck="false"
            @keydown.enter="performSearch"
        />
        <Button
            label="Search"
            @click="performSearch"
        />
        <Button
            icon="pi pi-bars"
            rounded
            text
            severity="secondary"
            title="Export/Import"
            @click="exportImportMenu?.toggle($event)"
        />
        <Menu
            ref="exportImportMenu"
            :model="exportImportItems"
            :popup="true"
        />
    </header>

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
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Menu from "primevue/menu";
import { useUIStore } from "../stores/ui";
import { debounce } from "../utils";
import { runSearch } from "../services/search";
import { exportCollection, importGraph } from "../services/collection";

const uiStore = useUIStore();
const query = ref<string>("");
const fileInput = ref<HTMLInputElement | null>(null);
const exportImportMenu = ref<typeof Menu | null>(null);

const exportImportItems = [
    {
        label: "Export collection",
        command: handleExport,
    },
    {
        label: "Import graph",
        command: triggerImport,
    },
];

const performSearch = debounce(async (): Promise<void> => {
    if (query.value.trim()) {
        await runSearch(query.value);
    }
}, 300);

function handleExport(): void {
    exportCollection();
}

function triggerImport(): void {
    fileInput.value?.click();
}

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
