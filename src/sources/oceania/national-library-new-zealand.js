async function nlnzSearchFn({ query, limit = 10, testing = false }) {
    return { docs: [], total: 0 };
}

async function nextPageFn(url) {}

async function scrapeFn(url) {}

export const source = {
    metadata: {
        id: "nlnz",
        label: "National Library of New Zealand",
        country: "New Zealand",
        region: "Oceania",
        enabled: true,
        lat: -41.3,
        lng: 174.8,
    },
    searchFn: nlnzSearchFn,
    nextPageFn,
    scrapeFn,
};
