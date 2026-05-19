async function sanLibrarySearchFn({ query, limit = 10, testing = false }) {
    return { docs: [], total: 0 };
}

async function nextPageFn(url) {}

async function scrapeFn(url) {}

export const source = {
    metadata: {
        id: "san",
        label: "South African National Library",
        country: "South Africa",
        region: "Africa",
        enabled: true,
        lat: -33.9,
        lng: 18.4,
    },
    searchFn: sanLibrarySearchFn,
    nextPageFn,
    scrapeFn,
};
