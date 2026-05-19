async function bnfSearchFn({ query, limit = 10, testing = false }) {
    return { docs: [], total: 0 };
}

async function nextPageFn(url) {}

async function scrapeFn(url) {}

export const source = {
    metadata: {
        id: "bnf",
        label: "Bibliothèque Nationale de France",
        country: "France",
        region: "Europe",
        enabled: true,
        lat: 48.8,
        lng: 2.4,
    },
    searchFn: bnfSearchFn,
    nextPageFn,
    scrapeFn,
};
