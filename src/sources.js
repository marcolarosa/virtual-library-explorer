// ─── Region colors ────────────────────────────────────────────────────────────
export const REGION_COLORS = {
    Americas: "#e74c3c",
    Europe: "#3498db",
    Oceania: "#2ecc71",
    Africa: "#f39c12",
    Asia: "#C980FF",
};

export function getRegionColor(region) {
    return REGION_COLORS[region] || "#888888";
}

// ─── Source registry ─────────────────────────────────────────────────────────
const modules = import.meta.glob("./sources/**/*.js", { eager: true });

export const SOURCES = Object.values(modules)
    .filter((m) => m.source)
    .map((m) => ({ ...m.source.metadata, searchFn: m.source.searchFn }));

export function getSource(id) {
    return SOURCES.find((s) => s.id === id);
}

export function enabledSources() {
    return SOURCES.filter((s) => s.enabled);
}
