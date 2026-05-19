async function bnsSearchFn({ query, limit = 10, testing = false }) {
    return { docs: [], total: 0 };
}

async function nextPageFn(url) {}

async function scrapeFn(url) {}

export const source = {
    metadata: {
        id: "bns",
        label: "Bibliothèque Nationale Senegal",
        country: "Senegal",
        region: "Africa",
        enabled: true,
        lat: 14.6,
        lng: -14.6,
    },
    searchFn: bnsSearchFn,
    nextPageFn,
    scrapeFn,
};
