async function baSearchFn({ query, limit = 10, testing = false }) {
    return { docs: [], total: 0 };
}

async function nextPageFn(url) {}

async function scrapeFn(url) {}

export const source = {
    metadata: {
        id: "ba",
        label: "Bibliotheca Alexandrina",
        country: "Egypt",
        region: "Africa",
        enabled: true,
        lat: 31.2,
        lng: 29.9,
    },
    searchFn: baSearchFn,
    nextPageFn,
    scrapeFn,
};
