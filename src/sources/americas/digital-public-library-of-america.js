import { cachedFetch, fetchNextPageData } from "../../utils.js";

export async function dplaSearchFn({ query, testing = false }) {
    const DPLA_SCRAPE_MAPPING = {
        dataPath: "searchResults",
        total: "resultCount",
        fields: {
            itemId: "id",
            title: "title",
            image: "thumbnail",
            creator: "creator",
        },
    };

    const url = `https://dp.la/search?q=${encodeURIComponent(query)}`;
    const key = `dpla::${query}`;
    return cachedFetch(key, async () => {
        const { docs, total } = await fetchNextPageData(testing, url, DPLA_SCRAPE_MAPPING);
        console.log(docs, total);
        return {
            docs: docs
                .filter((item) => item.itemId)
                .map((item) => ({
                    id: `dpla::${item.itemId}`,
                    title: item.title || "Untitled",
                    type: "work",
                    description: "",
                    date: "",
                    url: `https://dp.la/item/${item.itemId}`,
                    thumbnailUrl: item.image || "",
                    sourceId: "dpla",
                    subjects: [],
                    creators: item.creator ? [item.creator] : [],
                })),
            total,
        };
    });
}
