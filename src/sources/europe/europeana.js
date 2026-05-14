import { cachedFetch, fetchHtmlAndExtract } from "../../utils";

export async function europeanaSearchFn({ query, testing = false }) {
    const EUROPEANA_SCRAPE_MAPPING = {
        container: "div.card-wrapper",
        fields: {
            title: { selector: ".card-title .link-text", extract: "text" },
            url: { selector: "a.card-link", extract: "href" },
            image: { selector: ".card-img:not(.default-thumbnail) img", extract: "src" },
        },
        total: { selector: "output[data-qa='results status message']", extract: "text" },
    };

    const url = `https://www.europeana.eu/en/search?page=1&view=list&query=${query}`;
    const key = `europeana::${query}`;
    return cachedFetch(key, async () => {
        const { docs: raw, total } = await fetchHtmlAndExtract(
            testing,
            url,
            EUROPEANA_SCRAPE_MAPPING,
        );
        return {
            docs: raw.map((item) => ({
                id: `europeana::${encodeURIComponent(item.url || item.title)}`,
                title: item.title || "Untitled",
                type: "work",
                description: "",
                date: "",
                url: item.url ? `https://www.europeana.eu${item.url}` : "",
                thumbnailUrl: item.image || "",
                sourceId: "europeana",
                subjects: [],
                creators: [],
            })),
            total,
        };
    });
}
