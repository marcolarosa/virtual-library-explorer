async function nliSearchFn({ query, limit = 10, testing = false }) {
    return { docs: [], total: 0 };
}

async function nextPageFn(url) {}

async function scrapeFn(url) {}

export const source = {
    metadata: {
        id: "nli",
        label: "National Library of India",
        country: "India",
        region: "Asia",
        enabled: true,
        lat: 28.5,
        lng: 77.2,
    },
    searchFn: nliSearchFn,
    nextPageFn,
    scrapeFn,
};
