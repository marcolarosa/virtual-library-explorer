import { slvSearchFn } from "./sources/oceania/state-library-of-victoria.js";
import { troveSearchFn } from "./sources/oceania/trove.js";
import { europeanaSearchFn } from "./sources/europe/europeana.js";
import { dplaSearchFn } from "./sources/americas/digital-public-library-of-america.js";
import { locSearchFn } from "./sources/americas/library-of-congress.js";
import { bvSearchFn } from "./sources/americas/biblioteca-vasconcelos.js";
import { bnaSearchFn } from "./sources/americas/biblioteca-nacional-argentina.js";
import { tplSearchFn } from "./sources/americas/toronto-public-library.js";
import { blSearchFn } from "./sources/europe/british-library.js";
import { bnfSearchFn } from "./sources/europe/bibliothèque-nationale-france.js";
import { bneSearchFn } from "./sources/europe/biblioteca-nacional-espana.js";
import { dnbSearchFn } from "./sources/europe/deutsche-nationalbibliothek.js";
import { nlnzSearchFn } from "./sources/oceania/national-library-new-zealand.js";
import { nlaSearchFn } from "./sources/oceania/national-library-australia.js";
import { sanLibrarySearchFn } from "./sources/africa/south-african-national-library.js";
import { bnsSearchFn } from "./sources/africa/bibliothèque-nationale-senegal.js";
import { knlSearchFn } from "./sources/africa/kenya-national-library.js";
import { nnlSearchFn } from "./sources/africa/nigerian-national-library.js";
import { baSearchFn } from "./sources/africa/bibliotheca-alexandrina.js";
import { ndlSearchFn } from "./sources/asia/national-diet-library.js";
import { nlkSearchFn } from "./sources/asia/national-library-korea.js";
import { nlcSearchFn } from "./sources/asia/national-library-china.js";
import { nliSearchFn } from "./sources/asia/national-library-india.js";
import { nltSearchFn } from "./sources/asia/national-library-thailand.js";

// ─── Region colors ────────────────────────────────────────────────────────────
export const REGION_COLORS = {
    Americas: "#e74c3c",
    Europe: "#3498db",
    Oceania: "#2ecc71",
    Africa: "#f39c12",
    Asia: "#9b59b6",
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
    {
        id: "bl",
        label: "British Library",
        shortLabel: "BL",
        country: "GB",
        region: "Europe",
        searchFn: blSearchFn,
        enabled: true,
        lat: 51.5,
        lng: -0.1,
    },
    {
        id: "bnf",
        label: "Bibliothèque Nationale de France",
        shortLabel: "BNF",
        country: "FR",
        region: "Europe",
        searchFn: bnfSearchFn,
        enabled: true,
        lat: 48.8,
        lng: 2.4,
    },
    {
        id: "bne",
        label: "Biblioteca Nacional de España",
        shortLabel: "BNE",
        country: "ES",
        region: "Europe",
        searchFn: bneSearchFn,
        enabled: true,
        lat: 40.4,
        lng: -3.7,
    },
    {
        id: "dnb",
        label: "Deutsche Nationalbibliothek",
        shortLabel: "DNB",
        country: "DE",
        region: "Europe",
        searchFn: dnbSearchFn,
        enabled: true,
        lat: 52.5,
        lng: 13.4,
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
        id: "bv",
        label: "Biblioteca Vasconcelos",
        shortLabel: "BV",
        country: "MX",
        region: "Americas",
        searchFn: bvSearchFn,
        enabled: true,
        lat: 25.7,
        lng: -103.3,
    },
    {
        id: "bna",
        label: "Biblioteca Nacional Argentina",
        shortLabel: "BNA",
        country: "AR",
        region: "Americas",
        searchFn: bnaSearchFn,
        enabled: true,
        lat: -34.6,
        lng: -58.3,
    },
    {
        id: "tpl",
        label: "Toronto Public Library",
        shortLabel: "TPL",
        country: "CA",
        region: "Americas",
        searchFn: tplSearchFn,
        enabled: true,
        lat: 43.6,
        lng: -79.4,
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
    {
        id: "nlnz",
        label: "National Library of New Zealand",
        shortLabel: "NLNZ",
        country: "NZ",
        region: "Oceania",
        searchFn: nlnzSearchFn,
        enabled: true,
        lat: -41.3,
        lng: 174.8,
    },
    {
        id: "nla",
        label: "National Library of Australia",
        shortLabel: "NLA",
        country: "AU",
        region: "Oceania",
        searchFn: nlaSearchFn,
        enabled: true,
        lat: -35.3,
        lng: 149.1,
    },
    {
        id: "san",
        label: "South African National Library",
        shortLabel: "SANL",
        country: "ZA",
        region: "Africa",
        searchFn: sanLibrarySearchFn,
        enabled: true,
        lat: -33.9,
        lng: 18.4,
    },
    {
        id: "bns",
        label: "Bibliothèque Nationale Senegal",
        shortLabel: "BNS",
        country: "SN",
        region: "Africa",
        searchFn: bnsSearchFn,
        enabled: true,
        lat: 14.6,
        lng: -14.6,
    },
    {
        id: "knl",
        label: "Kenya National Library",
        shortLabel: "KNL",
        country: "KE",
        region: "Africa",
        searchFn: knlSearchFn,
        enabled: true,
        lat: -1.3,
        lng: 36.8,
    },
    {
        id: "nnl",
        label: "Nigerian National Library",
        shortLabel: "NNL",
        country: "NG",
        region: "Africa",
        searchFn: nnlSearchFn,
        enabled: true,
        lat: 9.0,
        lng: 7.5,
    },
    {
        id: "ba",
        label: "Bibliotheca Alexandrina",
        shortLabel: "BA",
        country: "EG",
        region: "Africa",
        searchFn: baSearchFn,
        enabled: true,
        lat: 31.2,
        lng: 29.9,
    },
    {
        id: "ndl",
        label: "National Diet Library",
        shortLabel: "NDL",
        country: "JP",
        region: "Asia",
        searchFn: ndlSearchFn,
        enabled: true,
        lat: 35.6,
        lng: 139.7,
    },
    {
        id: "nlk",
        label: "National Library of Korea",
        shortLabel: "NLK",
        country: "KR",
        region: "Asia",
        searchFn: nlkSearchFn,
        enabled: true,
        lat: 37.6,
        lng: 127.0,
    },
    {
        id: "nlc",
        label: "National Library of China",
        shortLabel: "NLC",
        country: "CN",
        region: "Asia",
        searchFn: nlcSearchFn,
        enabled: true,
        lat: 39.9,
        lng: 116.3,
    },
    {
        id: "nli",
        label: "National Library of India",
        shortLabel: "NLI",
        country: "IN",
        region: "Asia",
        searchFn: nliSearchFn,
        enabled: true,
        lat: 28.5,
        lng: 77.2,
    },
    {
        id: "nlt",
        label: "National Library of Thailand",
        shortLabel: "NLT",
        country: "TH",
        region: "Asia",
        searchFn: nltSearchFn,
        enabled: true,
        lat: 13.7,
        lng: 100.5,
    },
];

export function getSource(id) {
    return SOURCES.find((s) => s.id === id);
}

export function enabledSources() {
    return SOURCES.filter((s) => s.enabled);
}
