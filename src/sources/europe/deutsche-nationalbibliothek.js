async function dnbSearchFn({ query, limit = 10, testing = false }) {
    return { docs: [], total: 0 };
}

async function nextPageFn(url) {}

async function scrapeFn(url) {}

export const source = {
    metadata: {
        id: "dnb",
        label: "Deutsche Nationalbibliothek",
        country: "Germany",
        region: "Europe",
        enabled: true,
        lat: 52.5,
        lng: 13.4,
    },
    searchFn: dnbSearchFn,
    nextPageFn,
    scrapeFn,
};
