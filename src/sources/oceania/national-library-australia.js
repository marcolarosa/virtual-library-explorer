async function nlaSearchFn({ query, limit = 10, testing = false }) {
    return { docs: [], total: 0 };
}

async function nextPageFn(url) {}

async function scrapeFn(url) {}

export const source = {
    metadata: {
        id: "nla",
        label: "National Library of Australia",
        country: "Australia",
        region: "Oceania",
        enabled: true,
        lat: -35.296623,
        lng: 149.129822,
    },
    searchFn: nlaSearchFn,
    nextPageFn,
    scrapeFn,
};
