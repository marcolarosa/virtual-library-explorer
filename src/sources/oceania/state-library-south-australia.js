async function slsaSearchFn({ query, limit = 10, testing = false }) {
    return { docs: [], total: 0 };
}

async function nextPageFn(url) {}

async function scrapeFn(url) {}

export const source = {
    metadata: {
        id: "slsa",
        label: "State Library of South Australia",
        country: "Australia",
        region: "Oceania",
        enabled: true,
        lat: -34.9209,
        lng: 138.6022,
    },
    searchFn: slsaSearchFn,
    nextPageFn,
    scrapeFn,
};
