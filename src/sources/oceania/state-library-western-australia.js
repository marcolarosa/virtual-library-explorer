async function slwaSearchFn({ query, limit = 10, testing = false }) {
    return { docs: [], total: 0 };
}

async function nextPageFn(url) {}

async function scrapeFn(url) {}

export const source = {
    metadata: {
        id: "slwa",
        label: "State Library of Western Australia",
        country: "Australia",
        region: "Oceania",
        enabled: true,
        lat: -31.949,
        lng: 115.8605,
    },
    searchFn: slwaSearchFn,
    nextPageFn,
    scrapeFn,
};
