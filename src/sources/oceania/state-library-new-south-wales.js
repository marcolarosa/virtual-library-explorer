async function slnswSearchFn({ query, limit = 10, testing = false }) {
    return { docs: [], total: 0 };
}

async function nextPageFn(url) {}

async function scrapeFn(url) {}

export const source = {
    metadata: {
        id: "slnsw",
        label: "State Library of New South Wales",
        country: "Australia",
        region: "Oceania",
        enabled: true,
        lat: -33.866867,
        lng: 151.212845,
    },
    searchFn: slnswSearchFn,
    nextPageFn,
    scrapeFn,
};
