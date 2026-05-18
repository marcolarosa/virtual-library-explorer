<template>
    <div class="relative w-screen h-screen">
        <GlobeView />
        <SearchBar />
        <SourcePanel />
        <CollectionDrawer />
        <LocationResultsDrawer />
    </div>
</template>

<script setup>
import { onMounted } from "vue";
import { useCollectionStore } from "./stores/collection.js";
import GlobeView from "./components/GlobeView.vue";
import SearchBar from "./components/SearchBar.vue";
import SourcePanel from "./components/SourcePanel.vue";
import CollectionDrawer from "./components/CollectionDrawer.vue";
import LocationResultsDrawer from "./components/LocationResultsDrawer.vue";

const collectionStore = useCollectionStore();

onMounted(() => {
    collectionStore.load();
});
</script>
