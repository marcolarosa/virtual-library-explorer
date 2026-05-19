async function bvSearchFn({ query, limit = 10, testing = false }) {
    return { docs: [], total: 0 };
}

async function nextPageFn(url) {}

async function scrapeFn(url) {}

export const source = {
    metadata: {
        id: "bv",
        label: "Biblioteca Vasconcelos",
        country: "Mexico",
        region: "Americas",
        enabled: true,
        lat: 25.7,
        lng: -103.3,
    },
    searchFn: bvSearchFn,
    nextPageFn,
    scrapeFn,
};
