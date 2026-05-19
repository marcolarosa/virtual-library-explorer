async function tplSearchFn({ query, limit = 10, testing = false }) {
    return { docs: [], total: 0 };
}

async function nextPageFn(url) {}

async function scrapeFn(url) {}

export const source = {
    metadata: {
        id: "tpl",
        label: "Toronto Public Library",
        country: "Canada",
        region: "Americas",
        enabled: true,
        lat: 43.6,
        lng: -79.4,
    },
    searchFn: tplSearchFn,
    nextPageFn,
    scrapeFn,
};
