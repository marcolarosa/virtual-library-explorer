async function nlkSearchFn({ query, limit = 10, testing = false }) {
    return { docs: [], total: 0 };
}

async function nextPageFn(url) {}

async function scrapeFn(url) {}

export const source = {
    metadata: {
        id: "nlk",
        label: "National Library of Korea",
        country: "South Korea",
        region: "Asia",
        enabled: true,
        lat: 37.6,
        lng: 127.0,
    },
    searchFn: nlkSearchFn,
    nextPageFn,
    scrapeFn,
};
