import {
    fetchJsonWithCorsFallback,
    cachedFetch,
    normalizeStr,
    fetchHtmlAndExtract,
} from "./utils.js";

function resolvePath(obj, path) {
    return path.match(/[^.[\]]+/g)?.reduce((cur, k) => cur?.[k], obj);
}

// ─── Generic search helper ───────────────────────────────────────────────────
// url:     string | (query, limit) => string
// items:   (data) => array  — extracts the results array from the response
// mapDict: { key: "dot.path[0]" | ["dot.path[0]", default] | (item) => value }
// map:     (item) => Node   — imperative alternative to mapDict
export async function search({ testing, sourceId, url, headers, query, items, map, mapDict }) {
    const key = `${sourceId}::${query}`;
    const mapFn = mapDict
        ? (item) =>
              Object.fromEntries(
                  Object.entries(mapDict).map(([k, v]) => {
                      if (typeof v === "function") return [k, v(item)];
                      if (Array.isArray(v)) return [k, resolvePath(item, v[0]) ?? v[1]];
                      return [k, resolvePath(item, v)];
                  }),
              )
        : map;
    return cachedFetch(key, async () => {
        const { data } = await fetchJsonWithCorsFallback(testing, url, headers);
        return (items(data) || []).map(mapFn);
    });
}

// ─── Library of Congress ─────────────────────────────────────────────────────
export async function locSearchFn({ query, limit = 10, testing = false }) {
    return search({
        testing,
        sourceId: "loc",
        url: `https://www.loc.gov/search/?q=${query}&fo=json`,
        query,
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

// ─── Trove (NLA) ─────────────────────────────────────────────────────────────
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

    const docs = [];
    for (let endpoint of endpoints) {
        let resp = await search({
            testing,
            sourceId: "trove",
            url: endpoint,
            headers: {
                apiKey,
            },
            query,
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
        docs.push(...resp);
    }
    return docs;
}

// ─── Europeana (HTML scrape) ─────────────────────────────────────────────────
export async function europeanaSearchFn({ query, testing = false }) {
    const EUROPEANA_SCRAPE_MAPPING = {
        container: "div.card-wrapper",
        fields: {
            title: { selector: ".card-title .link-text", extract: "text" },
            url: { selector: "a.card-link", extract: "href" },
            image: { selector: ".card-img:not(.default-thumbnail) img", extract: "src" },
        },
    };

    const url = `https://www.europeana.eu/en/search?page=1&view=list&query=${query}`;
    const key = `europeana::${query}`;
    return cachedFetch(key, async () => {
        const raw = await fetchHtmlAndExtract(testing, url, EUROPEANA_SCRAPE_MAPPING);
        return raw.map((item) => ({
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
        }));
    });
}

// ─── Rijksmuseum ─────────────────────────────────────────────────────────────
// function rijksSearchFn(query, { apiKey = API_KEYS.rijksmuseum } = {}) {
//     if (!apiKey) return [];
//     return search({
//         sourceId: "rijks",
//         url: `https://www.rijksmuseum.nl/api/en/collection?key=${apiKey}&q=${encodeURIComponent(query)}&ps=10&imgonly=true`,
//         query,
//         items: (data) => data.artObjects || [],
//         mapDict: {
//             id: (obj) => `rijksmuseum::${obj.objectNumber}`,
//             title: (obj) => obj.title || "Untitled",
//             type: () => "work",
//             description: ["longTitle", ""],
//             date: ["dating.presentingDate", ""],
//             url: ["links.web", ""],
//             thumbnailUrl: ["webImage.url", ""],
//             sourceId: () => "rijksmuseum",
//             rawSubjects: () => [],
//             rawCreators: (obj) => (obj.principalOrFirstMaker ? [obj.principalOrFirstMaker] : []),
//             rawRelated: ["objectTypes", []],
//         },
//     });
// }

// ─── DPLA ────────────────────────────────────────────────────────────────────
export async function dplaSearchFn({ query, testing = false }) {
    const DPLA_SCRAPE_MAPPING = {
        container: 'li[class*="listItem"]',
        fields: {
            title: { selector: "h2 a", extract: "text" },
            itemId: { selector: 'input[type="checkbox"]', extract: "data-id" },
            image: { selector: "img", extract: "src" },
            creator: { selector: '[class*="itemAuthorAndDate"] span:last-child', extract: "text" },
        },
    };

    const url = `https://dp.la/search?q=${encodeURIComponent(query)}`;
    const key = `dpla::${query}`;
    return cachedFetch(key, async () => {
        const raw = await fetchHtmlAndExtract(testing, url, DPLA_SCRAPE_MAPPING);
        return raw
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
            }));
    });
}

// ─── SLV ────────────────────────────────────────────────────────────────────
export async function slvSearchFn({ query, limit = 10, testing = false }) {
    const url = `https://find.slv.vic.gov.au/primaws/rest/pub/pnxs?acTriggered=false&blendFacetsSeparately=false&citationTrailFilterByAvailability=true&disableCache=false&getMore=0&inst=61SLV_INST&isCDSearch=false&lang=en&limit=${limit}&newspapersActive=true&newspapersSearch=false&offset=0&otbRanking=false&pcAvailability=true&qExclude=&qInclude=&rapido=false&refEntryActive=false&rtaLinks=true&scope=slv_local&searchInFulltextUserSelection=true&skipDelivery=Y&sort=rank&tab=searchProfile&vid=61SLV_INST%3ASLV&q=any,contains,${encodeURIComponent(query)}`;
    return await search({
        testing,
        sourceId: "slv",
        url,
        query,
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

// ─── Source registry ─────────────────────────────────────────────────────────
export const SOURCES = [
    {
        id: "loc",
        label: "Library of Congress",
        shortLabel: "LoC",
        country: "US",
        region: "Americas",
        color: "#1abc9c",
        searchFn: locSearchFn,
        enabled: true,
    },
    {
        id: "trove",
        label: "Trove (NLA)",
        shortLabel: "Trove",
        country: "AU",
        region: "Oceania",
        color: "#2ecc71",
        searchFn: troveSearchFn,
        enabled: true,
    },
    {
        id: "europeana",
        label: "Europeana",
        shortLabel: "Euro",
        country: "EU",
        region: "Europe",
        color: "#3498db",
        searchFn: europeanaSearchFn,
        enabled: true,
    },
    // {
    //     id: "rijksmuseum",
    //     label: "Rijksmuseum",
    //     shortLabel: "Rijks",
    //     country: "NL",
    //     region: "Europe",
    //     color: "#9b59b6",
    //     searchFn: rijksSearchFn,
    //     enabled: false,
    //     requiresKey: true,
    // },
    {
        id: "dpla",
        label: "Digital Public Library of America",
        shortLabel: "DPLA",
        country: "US",
        region: "Americas",
        color: "#e74c3c",
        searchFn: dplaSearchFn,
        enabled: true,
        requiresKey: false,
    },
    {
        id: "slv",
        label: "State Library of Victoria",
        shortLabel: "SLV",
        country: "AU",
        region: "Oceania",
        color: "#e74c3c",
        searchFn: slvSearchFn,
        enabled: true,
        requiresKey: false,
    },
];

export function getSource(id) {
    return SOURCES.find((s) => s.id === id);
}

export function enabledSources() {
    return SOURCES.filter((s) => s.enabled);
}
