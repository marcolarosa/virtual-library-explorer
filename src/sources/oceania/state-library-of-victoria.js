import { search } from "../../sources";

export async function slvSearchFn({ query, limit = 10, testing = false }) {
    const url = `https://find.slv.vic.gov.au/primaws/rest/pub/pnxs?acTriggered=false&blendFacetsSeparately=false&citationTrailFilterByAvailability=true&disableCache=false&getMore=0&inst=61SLV_INST&isCDSearch=false&lang=en&limit=${limit}&newspapersActive=true&newspapersSearch=false&offset=0&otbRanking=false&pcAvailability=true&qExclude=&qInclude=&rapido=false&refEntryActive=false&rtaLinks=true&scope=slv_local&searchInFulltextUserSelection=true&skipDelivery=Y&sort=rank&tab=searchProfile&vid=61SLV_INST%3ASLV&q=any,contains,${encodeURIComponent(query)}`;
    return await search({
        testing,
        sourceId: "slv",
        url,
        query,
        total: (data) => data.info.total || null,
        items: (data) => data.docs || [],
        mapDict: {
            id: (doc) => `slv::${doc["@id"]}`,
            title: "pnx.display.title[0]",
            type: "pnx.display.type[0]",
            description: ["pnx.display.description[0]", ""],
            date: ["pnx.display.lds19[0]", ""],
            url: ["@id", ""],
            thumbnailUrl: ["object", ""],
            sourceId: () => "slv",
            subjects: (doc) =>
                (doc.pnx.display.lds11 || []).map((s) => (typeof s === "string" ? s : s.name)),
            creators: (doc) => {
                const au = doc.pnx.addata.au;
                return Array.isArray(au) ? au : au ? [au] : [];
            },
        },
    });
}
