async function bneSearchFn({ query, limit = 10, testing = false }) {
    return { docs: [], total: 0 };
}

async function nextPageFn(url) {}

async function scrapeFn(url) {}

export const source = {
    metadata: {
        id: "bne",
        label: "Biblioteca Nacional de España",
        country: "Spain",
        region: "Europe",
        enabled: true,
        lat: 40.4,
        lng: -3.7,
    },
    searchFn: bneSearchFn,
    nextPageFn,
    scrapeFn,
};
