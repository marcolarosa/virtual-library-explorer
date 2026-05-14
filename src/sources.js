import { slvSearchFn } from "./sources/oceania/state-library-of-victoria.js";
import { troveSearchFn } from "./sources/oceania/trove.js";
import { europeanaSearchFn } from "./sources/europe/europeana.js";
import { dplaSearchFn } from "./sources/americas/digital-public-library-of-america.js";
import { locSearchFn } from "./sources/americas/library-of-congress.js";

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
        enabled: false,
        lat: 38.9,
        lng: -77.0,
    },
    {
        id: "trove",
        label: "Trove (NLA)",
        shortLabel: "Trove",
        country: "AU",
        region: "Oceania",
        color: "#2ecc71",
        searchFn: troveSearchFn,
        enabled: false,
        lat: -35.3,
        lng: 149.1,
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
        lat: 50.8,
        lng: 4.4,
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
        enabled: false,
        lat: 42.4,
        lng: -71.1,
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
        lat: -37.8,
        lng: 144.9,
    },
];

export function getSource(id) {
    return SOURCES.find((s) => s.id === id);
}

export function enabledSources() {
    return SOURCES.filter((s) => s.enabled);
}
