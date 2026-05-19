async function nlcSearchFn({ query, limit = 10, testing = false }) {
    return { docs: [], total: 0 };
}

async function nextPageFn(url) {}

async function scrapeFn(url) {}

export const source = {
    metadata: {
        id: "nlc",
        label: "National Library of China",
        country: "China",
        region: "Asia",
        enabled: true,
        lat: 39.9,
        lng: 116.3,
    },
    searchFn: nlcSearchFn,
    nextPageFn,
    scrapeFn,
};
