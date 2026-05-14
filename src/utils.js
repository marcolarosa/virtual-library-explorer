export function debounce(fn, ms) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };
}

export function queryNodeId(query) {
    return `query::${query.toLowerCase().trim()}`;
}

export function sourceAnchorId(sourceId) {
    return `source::${sourceId}`;
}

export function normalizeStr(s) {
    return (s || "").toLowerCase().trim();
}

export function truncate(s, n = 60) {
    if (!s) return "";
    return s.length > n ? s.slice(0, n) + "…" : s;
}

const PROXIES = [
    (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    // (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

const _cache = new Map();

export async function cachedFetch(key, fetchFn) {
    if (_cache.has(key)) return _cache.get(key);
    const result = await fetchFn();
    _cache.set(key, result);
    return result;
}

export function generateEdgeId(type, nodeIdA, nodeIdB, label = "") {
    const sorted = [nodeIdA, nodeIdB].sort().join("::");
    return `${type}::${sorted}${label ? "::" + normalizeStr(label) : ""}`;
}

function getPathValue(obj, path) {
    return path
        .split(/[\.\[\]]/)
        .filter(Boolean)
        .reduce((o, key) => o?.[key], obj);
}

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

export async function fetchJsonWithCorsFallback(testing, url, headers, options = {}) {
    // Try direct first
    let lastErr;
    if (testing) {
        const resp = await fetch(url, { headers, signal: AbortSignal.timeout(12000) });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return { data: await resp.json(), proxyUsed: false };
    } else {
        for (const makeProxy of PROXIES) {
            try {
                const resp = await fetch(makeProxy(url), {
                    headers,
                    signal: AbortSignal.timeout(12000),
                });
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                return { data: await resp.json(), proxyUsed: true };
            } catch (e) {
                lastErr = e;
            }
        }
    }
}

export async function fetchHtmlAndExtract(testing, url, mapping) {
    const headers = {
        "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    };
    let resp;
    if (testing) {
        resp = await fetch(url, { headers, signal: AbortSignal.timeout(12000) });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    } else {
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
    }
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

export async function fetchNextPageData(testing, url, mapping) {
    const headers = {
        "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    };

    let resp;
    if (testing) {
        resp = await fetch(url, { headers, signal: AbortSignal.timeout(12000) });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    } else {
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
    }

    const html = await resp.text();

    console.log(html);
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
    if (!match) throw new Error("__NEXT_DATA__ not found");

    const nextData = JSON.parse(match[1]);
    console.log(nextData);
    const pageProps = nextData.props?.pageProps || {};

    const docs = extractFromPageProps(pageProps, mapping);

    let total = null;
    if (mapping.total) {
        total = getPathValue(pageProps, mapping.total) || 0;
        if (typeof total === "string") total = parseInt(total.replace(/[^\d]/g, "")) || 0;
    }

    return { docs, total, nextData };
}
