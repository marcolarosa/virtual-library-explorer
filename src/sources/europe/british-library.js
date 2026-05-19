async function blSearchFn({ query, limit = 10, testing = false }) {
    return { docs: [], total: 0 };
}

async function nextPageFn(url) {}

async function scrapeFn(url) {}

export const source = {
    metadata: {
        id: "bl",
        label: "British Library",
        country: "United Kingdom",
        region: "Europe",
        enabled: true,
        lat: 51.5,
        lng: -0.1,
    },
    searchFn: blSearchFn,
    nextPageFn,
    scrapeFn,
};
