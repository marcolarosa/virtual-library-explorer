async function knlSearchFn({ query, limit = 10, testing = false }) {
    return { docs: [], total: 0 };
}

async function nextPageFn(url) {}

async function scrapeFn(url) {}

export const source = {
    metadata: {
        id: "knl",
        label: "Kenya National Library",
        country: "Kenya",
        region: "Africa",
        enabled: true,
        lat: -1.3,
        lng: 36.8,
    },
    searchFn: knlSearchFn,
    nextPageFn,
    scrapeFn,
};
