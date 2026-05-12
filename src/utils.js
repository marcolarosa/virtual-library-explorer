export function debounce(fn, ms) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}

export function queryNodeId(query) {
  return `query::${query.toLowerCase().trim()}`
}

export function sourceAnchorId(sourceId) {
  return `source::${sourceId}`
}

export function normalizeStr(s) {
  return (s || '').toLowerCase().trim()
}

export function truncate(s, n = 60) {
  if (!s) return ''
  return s.length > n ? s.slice(0, n) + '…' : s
}

const PROXIES = [
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
]

export async function fetchWithCorsFallback(url, options = {}) {
  // Try direct first
  try {
    const resp = await fetch(url, { ...options, signal: AbortSignal.timeout(10000) })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    return { data: await resp.json(), proxyUsed: false }
  } catch (directErr) {
    // Try each proxy in order
    let lastErr = directErr
    for (const makeProxy of PROXIES) {
      try {
        const resp = await fetch(makeProxy(url), { signal: AbortSignal.timeout(12000) })
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        return { data: await resp.json(), proxyUsed: true }
      } catch (e) {
        lastErr = e
      }
    }
    throw new Error(`All attempts failed — last error: ${lastErr.message}`)
  }
}

const _cache = new Map()

export async function cachedFetch(key, fetchFn) {
  if (_cache.has(key)) return _cache.get(key)
  const result = await fetchFn()
  _cache.set(key, result)
  return result
}

export function generateEdgeId(type, nodeIdA, nodeIdB, label = '') {
  const sorted = [nodeIdA, nodeIdB].sort().join('::')
  return `${type}::${sorted}${label ? '::' + normalizeStr(label) : ''}`
}
