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
