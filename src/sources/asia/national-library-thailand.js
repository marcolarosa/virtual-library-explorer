async function nltSearchFn({ query, limit = 10, testing = false }) {
    return { docs: [], total: 0 };
}

async function nextPageFn(url) {}

async function scrapeFn(url) {}

export const source = {
    metadata: {
        id: "nlt",
        label: "National Library of Thailand",
        country: "Thailand",
        region: "Asia",
        enabled: true,
        lat: 13.7,
        lng: 100.5,
    },
    searchFn: nltSearchFn,
    nextPageFn,
    scrapeFn,
};
