async function nnlSearchFn({ query, limit = 10, testing = false }) {
    return { docs: [], total: 0 };
}

async function nextPageFn(url) {}

async function scrapeFn(url) {}

export const source = {
    metadata: {
        id: "nnl",
        label: "Nigerian National Library",
        country: "Nigeria",
        region: "Africa",
        enabled: true,
        lat: 9.0,
        lng: 7.5,
    },
    searchFn: nnlSearchFn,
    nextPageFn,
    scrapeFn,
};
