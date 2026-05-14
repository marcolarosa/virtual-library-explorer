import { search } from "../../utils.js";

export async function troveSearchFn({ query, limit = 5, testing = false }) {
    const apiKey = "3a0a200c2feaa87ccbaf2933e88eba56";
    const endpoints = [
        // newspapers and gazettes
        `https://trove.nla.gov.au/api/search/137?terms=%28%20${query}%20%29&pageSize=${limit}`,

        // images, maps and artefacts
        `https://trove.nla.gov.au/api/search/21?terms=%28%20${query}%20%29&pageSize=${limit}`,

        // research and reports
        `https://trove.nla.gov.au/api/search/136?terms=%28%20${query}%20%29&pageSize=${limit}`,

        // books and libraries
        `https://trove.nla.gov.au/api/search/135?terms=%28%20${query}%20%29&pageSize=${limit}`,

        // diaries, letters and archives
        `https://trove.nla.gov.au/api/search/12?terms=%28%20${query}%20%29&pageSize=${limit}`,

        // people and organisations
        `https://trove.nla.gov.au/api/search/18?terms=%28%20${query}%20%29&pageSize=${limit}`,

        // music, audio and video
        `https://trove.nla.gov.au/api/search/14?terms=%28%20${query}%20%29&pageSize=${limit}`,
    ];

    const result = {
        docs: [],
        total: 0,
    };
    for (let endpoint of endpoints) {
        let resp = await search({
            testing,
            sourceId: "trove",
            url: endpoint,
            headers: {
                apiKey,
            },
            query,
            total: (data) => data.totalRecords,
            items: (data) => data.works,
            mapDict: {
                id: (work) => `trove::${work.id}`,
                title: (work) => work.title || "Untitled",
                type: () => "work",
                description: ["snippet", ""],
                date: ["issued", ""],
                url: (work) => work.troveUrl || `https://trove.nla.gov.au/work/${work.id}`,
                thumbnailUrl: (work) =>
                    work.identifier?.find((i) => i.type === "thumbnail")?.value || "",
                sourceId: () => "trove",
                subjects: ["subject", []],
                creators: ["contributor", []],
            },
        });
        result.docs.push(...resp.docs);
        result.total += resp.total;
    }
    return result;
}
