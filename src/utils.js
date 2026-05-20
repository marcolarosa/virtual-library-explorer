/** Debounces a function, delaying execution until after `ms` milliseconds of inactivity. */
export function debounce(fn, ms) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };
}

/** Generates a stable node ID for a query string. */
export function queryNodeId(query) {
    return `query::${query.toLowerCase().trim()}`;
}

/** Normalizes a string by converting to lowercase and trimming whitespace. */
export function normalizeStr(s) {
    return (s || "").toLowerCase().trim();
}

/** Truncates a string to `n` characters (default 60), appending "…" if truncated. */
export function truncate(s, n = 60) {
    if (!s) return "";
    return s.length > n ? s.slice(0, n) + "…" : s;
}

function resolvePath(obj, path) {
    return path.match(/[^.[\]]+/g)?.reduce((cur, k) => cur?.[k], obj);
}

// CloudFront proxy deployed to: d2y6w4oov6gtvl.cloudfront.net
// Production URL configured via VITE_PROXY_URL environment variable (.env.production)
// Development can override in .env.development
// Fallback is for dev/emergency only and is intentionally kept as a secondary proxy
const CLOUDFRONT_URL = import.meta.env.VITE_PROXY_URL || "https://d2y6w4oov6gtvl.cloudfront.net";

const PROXIES = [
    (url) => `${CLOUDFRONT_URL}?url=${encodeURIComponent(url)}`,
    // Fallback for development/emergency only
    // (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
];

const _cache = new Map();

/** Caches the result of an async operation. Subsequent calls with the same key return the cached value. */
export async function cachedFetch(key, fetchFn) {
    if (_cache.has(key)) return _cache.get(key);
    const result = await fetchFn();
    _cache.set(key, result);
    return result;
}

/** Extracts a value from a nested object using dot/bracket notation path. */
function getPathValue(obj, path) {
    return path
        .split(/[\.\[\]]/)
        .filter(Boolean)
        .reduce((o, key) => o?.[key], obj);
}

// ─── Generic search helper ───────────────────────────────────────────────────
// testing: bool => true if running in testing
// sourceId: string => a descriptive label for the source
// url:     string => the API endpoint URL
// headers: object => optional HTTP headers for the request
// query:   string => the search query string
// total:   (data) => number => optional; extracts total result count from response
// items:   (data) => array  — extracts the results array from the response
// mapDict: { key: "dot.path[0]" | ["dot.path[0]", default] | (item) => value }
export async function search({ sourceId, url, headers, query, total, items, mapDict }) {
    const key = `${sourceId}::${query}`;
    const mapFn = (item) =>
        Object.fromEntries(
            Object.entries(mapDict).map(([k, v]) => {
                if (typeof v === "function") return [k, v(item)];
                if (Array.isArray(v)) return [k, resolvePath(item, v[0]) ?? v[1]];
                return [k, resolvePath(item, v)];
            }),
        );
    return cachedFetch(key, async () => {
        const { data } = await fetchJsonWithCorsFallback(url, headers);
        const docs = (items(data) || []).map(mapFn);
        const result = { docs };
        if (total) result.total = total(data);
        return result;
    });
}

/** Extracts items from Next.js page props using a mapping configuration. */
function extractFromPageProps(pageProps, mapping) {
    if (!mapping.dataPath) return [];

    const items = getPathValue(pageProps, mapping.dataPath);
    if (!Array.isArray(items)) return [];

    return items.map((item) => {
        const result = {};
        for (const [key, path] of Object.entries(mapping.fields || {})) {
            result[key] = getPathValue(item, path) ?? null;
        }
        return result;
    });
}

/** Fetches JSON via CORS proxy if needed. In testing mode, tries direct fetch. Returns {data, proxyUsed}. */
export async function fetchJsonWithCorsFallback(url, headers, options = {}) {
    headers = { ...headers, "x-origin-verify": "library-explorer-proxy" };
    let lastErr;
    for (const makeProxy of PROXIES) {
        try {
            const resp = await fetch(makeProxy(url, headers), {
                headers,
                signal: AbortSignal.timeout(12000),
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            return { data: await resp.json(), proxyUsed: true };
        } catch (e) {
            lastErr = e;
        }
    }
    if (!lastErr) lastErr = new Error("No proxies available");
    throw lastErr;
}

/** Fetches HTML and extracts data using CSS selectors. Returns {docs, total}. */
export async function fetchHtmlAndExtract(url, mapping) {
    const headers = {
        "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "x-origin-verify": "library-explorer-proxy",
    };
    let resp;
    let lastErr;
    for (const makeProxy of PROXIES) {
        try {
            resp = await fetch(makeProxy(url), { headers, signal: AbortSignal.timeout(12000) });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            break;
        } catch (e) {
            lastErr = e;
        }
    }
    if (!resp) throw lastErr;

    const html = await resp.text();
    let doc;
    if (typeof DOMParser !== "undefined") {
        doc = new DOMParser().parseFromString(html, "text/html");
    } else {
        const { JSDOM } = await import("jsdom");
        doc = new JSDOM(html).window.document;
    }

    const docs = Array.from(doc.querySelectorAll(mapping.container)).map((el) => {
        const result = {};
        for (const [key, { selector, extract }] of Object.entries(mapping.fields)) {
            const node = el.querySelector(selector);
            result[key] = node
                ? extract === "text"
                    ? node.textContent.trim()
                    : node.getAttribute(extract)
                : null;
        }
        return result;
    });

    let total = null;
    if (mapping.total) {
        const { selector, extract } = mapping.total;
        const node = doc.querySelector(selector);
        if (node) {
            const raw = extract === "text" ? node.textContent.trim() : node.getAttribute(extract);
            total = parseInt(raw.replace(/[^\d]/g, "")) || 0;
        }
    }

    return { docs, total };
}

/** Fetches and parses Next.js page data, extracting items using the provided mapping. Returns {docs, total, nextData}. */
export async function fetchNextPageData(url, mapping) {
    const headers = {
        "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "x-origin-verify": "library-explorer-proxy",
    };

    let resp;
    let lastErr;
    for (const makeProxy of PROXIES) {
        try {
            resp = await fetch(makeProxy(url), { headers, signal: AbortSignal.timeout(12000) });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            break;
        } catch (e) {
            lastErr = e;
        }
    }
    if (!resp) throw lastErr;

    const html = await resp.text();

    console.log(html);
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
    if (!match) throw new Error("__NEXT_DATA__ not found");

    const nextData = JSON.parse(match[1]);
    const pageProps = nextData.props?.pageProps || {};

    const docs = extractFromPageProps(pageProps, mapping);

    let total = null;
    if (mapping.total) {
        total = getPathValue(pageProps, mapping.total) || 0;
        if (typeof total === "string") total = parseInt(total.replace(/[^\d]/g, "")) || 0;
    }

    return { docs, total, nextData };
}
