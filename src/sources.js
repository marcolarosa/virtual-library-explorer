import { slvSearchFn } from "./sources/oceania/state-library-of-victoria.js";
import { troveSearchFn } from "./sources/oceania/trove.js";
import { europeanaSearchFn } from "./sources/europe/europeana.js";
import { dplaSearchFn } from "./sources/americas/digital-public-library-of-america.js";
import { locSearchFn } from "./sources/americas/library-of-congress.js";

// ─── Region colors ────────────────────────────────────────────────────────────
export const REGION_COLORS = {
    Americas: "#e74c3c",
    Europe: "#3498db",
    Oceania: "#2ecc71",
};

export function getRegionColor(region) {
    return REGION_COLORS[region] || "#888888";
}

// ─── Source registry ─────────────────────────────────────────────────────────
export const SOURCES = [
    {
        id: "loc",
        label: "Library of Congress",
        shortLabel: "LoC",
        country: "US",
        region: "Americas",
        searchFn: locSearchFn,
        enabled: true,
        lat: 38.9,
        lng: -77.0,
    },
    {
        id: "trove",
        label: "Trove (NLA)",
        shortLabel: "Trove",
        country: "AU",
        region: "Oceania",
        searchFn: troveSearchFn,
        enabled: true,
        lat: -35.3,
        lng: 149.1,
    },
    {
        id: "europeana",
        label: "Europeana",
        shortLabel: "Euro",
        country: "EU",
        region: "Europe",
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
        searchFn: dplaSearchFn,
        enabled: true,
        lat: 42.4,
        lng: -71.1,
    },
    {
        id: "slv",
        label: "State Library of Victoria",
        shortLabel: "SLV",
        country: "AU",
        region: "Oceania",
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
