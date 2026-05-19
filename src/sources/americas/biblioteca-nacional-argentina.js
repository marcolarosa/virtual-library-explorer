async function bnaSearchFn({ query, limit = 10, testing = false }) {
    return { docs: [], total: 0 };
}

async function nextPageFn(url) {}

async function scrapeFn(url) {}

export const source = {
    metadata: {
        id: "bna",
        label: "Biblioteca Nacional Argentina",
        country: "Argentina",
        region: "Americas",
        enabled: true,
        lat: -34.6,
        lng: -58.3,
    },
    searchFn: bnaSearchFn,
    nextPageFn,
    scrapeFn,
};
