async function slqSearchFn({ query, limit = 10, testing = false }) {
    return { docs: [], total: 0 };
}

async function nextPageFn(url) {}

async function scrapeFn(url) {}

export const source = {
    metadata: {
        id: "slq",
        label: "State Library of Queensland",
        country: "Australia",
        region: "Oceania",
        enabled: true,
        lat: -27.4712,
        lng: 153.0181,
    },
    searchFn: slqSearchFn,
    nextPageFn,
    scrapeFn,
};
