import { search } from "../../utils.js";

export async function locSearchFn({ query, limit = 10, testing = false }) {
    return search({
        testing,
        sourceId: "loc",
        url: `https://www.loc.gov/search/?q=${query}&fo=json`,
        query,
        total: (data) => data.pagination.total,
        items: (data) => data.results || [],
        mapDict: {
            id: (item) => `loc::${encodeURIComponent(item.url || item.id || item.title)}`,
            title: (item) => (Array.isArray(item.title) ? item.title[0] : item.title),
            type: () => "work",
            description: (item) =>
                Array.isArray(item.description) ? item.description[0] : item.description || "",
            date: ["date", ""],
            url: ["url", ""],
            thumbnailUrl: (item) => (item.image_url && item.image_url[0]) || "",
            sourceId: () => "loc",
            subjects: ["subject", []],
            creators: ["contributor", []],
        },
    });
}
