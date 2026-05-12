import { fetchWithCorsFallback, cachedFetch, normalizeStr } from './utils.js'

// API keys — read from localStorage so user can configure without editing source
export const API_KEYS = {
  get trove()      { return localStorage.getItem('apiKey:trove')      || '' },
  get europeana()  { return localStorage.getItem('apiKey:europeana')  || '' },
  get dpla()       { return localStorage.getItem('apiKey:dpla')       || '' },
  get rijksmuseum(){ return localStorage.getItem('apiKey:rijksmuseum')|| '' },
}

export function setApiKey(name, value) {
  localStorage.setItem(`apiKey:${name}`, value)
}

// ─── Mock sources (two so cross-source edges work in dev) ───────────────────

const MOCK_DATA_A = [
  { id: 'mock_a::1', title: 'The Natural History of Bees', type: 'work',
    description: 'A comprehensive Victorian-era study of bee behaviour and hive structure.',
    date: '1876', url: '#', thumbnailUrl: '',
    rawSubjects: ['apiculture', 'insects', 'natural history', 'entomology'],
    rawCreators: ['Cheshire, Frank R.'], rawRelated: [] },
  { id: 'mock_a::2', title: 'Honey Production in the Victorian Era', type: 'work',
    description: 'Commercial honey farming and its place in the rural economy.',
    date: '1891', url: '#', thumbnailUrl: '',
    rawSubjects: ['apiculture', 'food history', 'victorian england'],
    rawCreators: ['Bevan, Edward'], rawRelated: [] },
  { id: 'mock_a::3', title: "Darwin's Notes on Bumblebees", type: 'work',
    description: 'Transcripts of field observations made during the Beagle voyage.',
    date: '1854', url: '#', thumbnailUrl: '',
    rawSubjects: ['natural history', 'insects', 'evolution'],
    rawCreators: ['Darwin, Charles'], rawRelated: [] },
  { id: 'mock_a::4', title: 'Insects of Britain', type: 'work',
    description: 'Illustrated taxonomy of British insect species.',
    date: '1863', url: '#', thumbnailUrl: '',
    rawSubjects: ['insects', 'natural history', 'entomology', 'taxonomy'],
    rawCreators: ['Westwood, J.O.'], rawRelated: [] },
  { id: 'mock_a::5', title: 'The Beekeeper\'s Manual', type: 'work',
    description: 'Practical guide to hive management for amateur apiarists.',
    date: '1882', url: '#', thumbnailUrl: '',
    rawSubjects: ['apiculture', 'practical guides'],
    rawCreators: ['Cowan, T.W.'], rawRelated: [] },
]

const MOCK_DATA_B = [
  { id: 'mock_b::1', title: 'Apiculture in Ancient Egypt', type: 'work',
    description: 'Honey harvesting, sacred bees and hive imagery in Egyptian antiquity.',
    date: '1923', url: '#', thumbnailUrl: '',
    rawSubjects: ['apiculture', 'ancient egypt', 'food history'],
    rawCreators: ['Fraser, H.M.'], rawRelated: [] },
  { id: 'mock_b::2', title: 'Natural History Illustrations 1750–1850', type: 'work',
    description: 'A survey of the golden age of scientific illustration.',
    date: '1978', url: '#', thumbnailUrl: '',
    rawSubjects: ['natural history', 'illustration', 'botany'],
    rawCreators: ['Blunt, Wilfrid'], rawRelated: [] },
  { id: 'mock_b::3', title: 'Charles Darwin: A Biography', type: 'work',
    description: 'Life and letters of Charles Darwin, naturalist.',
    date: '1887', url: '#', thumbnailUrl: '',
    rawSubjects: ['natural history', 'evolution', 'biography'],
    rawCreators: ['Darwin, Charles'], rawRelated: [] },
  { id: 'mock_b::4', title: 'Victorian Domestic Science', type: 'work',
    description: 'Food preservation, home medicine and household management 1837–1901.',
    date: '1965', url: '#', thumbnailUrl: '',
    rawSubjects: ['victorian england', 'food history', 'domestic science'],
    rawCreators: ['Davidson, Caroline'], rawRelated: [] },
  { id: 'mock_b::5', title: 'Entomology for Beginners', type: 'work',
    description: 'Introduction to the study of insects for schools.',
    date: '1905', url: '#', thumbnailUrl: '',
    rawSubjects: ['entomology', 'insects', 'science education'],
    rawCreators: ['Packard, A.S.'], rawRelated: [] },
]

function mockSearchFn(data, sourceId) {
  return async (query) => {
    await new Promise(r => setTimeout(r, 300 + Math.random() * 400)) // fake latency
    const q = normalizeStr(query)
    return data
      .filter(r => {
        const text = [r.title, r.description, ...r.rawSubjects, ...r.rawCreators].join(' ')
        return normalizeStr(text).includes(q) || q.length < 3
      })
      .map(r => ({ ...r, sourceId }))
  }
}

// ─── Metropolitan Museum of Art ─────────────────────────────────────────────

async function metSearchFn(query) {
  const key = `met::${query}`
  return cachedFetch(key, async () => {
    const searchUrl = `https://collectionapi.metmuseum.org/public/collection/v1/search?q=${encodeURIComponent(query)}&hasImages=true`
    const { data: searchData } = await fetchWithCorsFallback(searchUrl)
    const ids = (searchData.objectIDs || []).slice(0, 10)
    const settled = await Promise.allSettled(
      ids.map(id =>
        fetchWithCorsFallback(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`)
          .then(r => r.data)
      )
    )
    return settled
      .filter(r => r.status === 'fulfilled' && r.value.title)
      .map(r => {
        const o = r.value
        return {
          id: `met::${o.objectID}`,
          title: o.title,
          type: 'work',
          description: [o.creditLine, o.medium].filter(Boolean).join(' — '),
          date: o.objectDate || '',
          url: o.objectURL || '',
          thumbnailUrl: o.primaryImageSmall || '',
          sourceId: 'met',
          rawSubjects: (o.tags || []).map(t => t.term),
          rawCreators: o.artistDisplayName ? [o.artistDisplayName] : [],
          rawRelated: [o.department].filter(Boolean),
        }
      })
  })
}

// ─── Library of Congress ─────────────────────────────────────────────────────

async function locSearchFn(query) {
  const key = `loc::${query}`
  return cachedFetch(key, async () => {
    const url = `https://www.loc.gov/search/?q=${encodeURIComponent(query)}&fo=json&c=10&at=results`
    const { data } = await fetchWithCorsFallback(url)
    return (data.results || [])
      .filter(item => item.title)
      .map(item => ({
        id: `loc::${encodeURIComponent(item.url || item.id || item.title)}`,
        title: Array.isArray(item.title) ? item.title[0] : item.title,
        type: 'work',
        description: Array.isArray(item.description) ? item.description[0] : (item.description || ''),
        date: item.date || '',
        url: item.url || '',
        thumbnailUrl: (item.image_url && item.image_url[0]) || '',
        sourceId: 'loc',
        rawSubjects: item.subject || [],
        rawCreators: item.contributor || [],
        rawRelated: item.partof || [],
      }))
  })
}

// ─── Trove (NLA) ─────────────────────────────────────────────────────────────

async function troveSearchFn(query, { apiKey = API_KEYS.trove } = {}) {
  if (!apiKey) return []
  const key = `trove::${query}`
  return cachedFetch(key, async () => {
    const url = `https://api.trove.nla.gov.au/v3/result?q=${encodeURIComponent(query)}&zone=book,article&encoding=json&n=10&key=${apiKey}`
    const { data } = await fetchWithCorsFallback(url)
    const results = []
    for (const zone of (data.response?.zone || [])) {
      for (const work of (zone.records?.work || zone.records?.article || [])) {
        results.push({
          id: `trove::${work.id}`,
          title: work.title || 'Untitled',
          type: 'work',
          description: work.snippet || '',
          date: work.issued || '',
          url: work.troveUrl || `https://trove.nla.gov.au/work/${work.id}`,
          thumbnailUrl: work.identifier?.find(i => i.type === 'thumbnail')?.value || '',
          sourceId: 'trove',
          rawSubjects: work.subject || [],
          rawCreators: work.contributor || [],
          rawRelated: [],
        })
      }
    }
    return results
  })
}

// ─── Europeana ───────────────────────────────────────────────────────────────

async function europeanaSearchFn(query, { apiKey = API_KEYS.europeana } = {}) {
  if (!apiKey) return []
  const key = `europeana::${query}`
  return cachedFetch(key, async () => {
    const url = `https://api.europeana.eu/record/v2/search.json?query=${encodeURIComponent(query)}&wskey=${apiKey}&rows=10&profile=rich`
    const { data } = await fetchWithCorsFallback(url)
    return (data.items || []).map(item => ({
      id: `europeana::${encodeURIComponent(item.id)}`,
      title: Array.isArray(item.title) ? item.title[0] : (item.title || 'Untitled'),
      type: 'work',
      description: Array.isArray(item.dcDescription) ? item.dcDescription[0] : '',
      date: (item.year || [''])[0],
      url: (item.edmIsShownAt || [''])[0],
      thumbnailUrl: (item.edmPreview || [''])[0],
      sourceId: 'europeana',
      rawSubjects: item.dcSubject || [],
      rawCreators: item.dcCreator || [],
      rawRelated: item.dataProvider || [],
    }))
  })
}

// ─── Rijksmuseum ─────────────────────────────────────────────────────────────

async function rijksSearchFn(query, { apiKey = API_KEYS.rijksmuseum } = {}) {
  if (!apiKey) return []
  const key = `rijks::${query}`
  return cachedFetch(key, async () => {
    const url = `https://www.rijksmuseum.nl/api/en/collection?key=${apiKey}&q=${encodeURIComponent(query)}&ps=10&imgonly=true`
    const { data } = await fetchWithCorsFallback(url)
    return (data.artObjects || []).map(obj => ({
      id: `rijksmuseum::${obj.objectNumber}`,
      title: obj.title || 'Untitled',
      type: 'work',
      description: obj.longTitle || '',
      date: obj.dating?.presentingDate || '',
      url: obj.links?.web || '',
      thumbnailUrl: obj.webImage?.url || '',
      sourceId: 'rijksmuseum',
      rawSubjects: [],
      rawCreators: obj.principalOrFirstMaker ? [obj.principalOrFirstMaker] : [],
      rawRelated: obj.objectTypes || [],
    }))
  })
}

// ─── DPLA ────────────────────────────────────────────────────────────────────

async function dplaSearchFn(query, { apiKey = API_KEYS.dpla } = {}) {
  if (!apiKey) return []
  const key = `dpla::${query}`
  return cachedFetch(key, async () => {
    const url = `https://api.dp.la/v2/items?q=${encodeURIComponent(query)}&api_key=${apiKey}&page_size=10`
    const { data } = await fetchWithCorsFallback(url)
    return (data.docs || []).map(doc => {
      const sr = doc.sourceResource || {}
      return {
        id: `dpla::${doc.id}`,
        title: Array.isArray(sr.title) ? sr.title[0] : (sr.title || 'Untitled'),
        type: 'work',
        description: Array.isArray(sr.description) ? sr.description[0] : '',
        date: sr.date?.displayDate || '',
        url: doc.isShownAt || '',
        thumbnailUrl: doc.object || '',
        sourceId: 'dpla',
        rawSubjects: (sr.subject || []).map(s => typeof s === 'string' ? s : s.name),
        rawCreators: Array.isArray(sr.creator) ? sr.creator : (sr.creator ? [sr.creator] : []),
        rawRelated: [],
      }
    })
  })
}

// ─── Source registry ─────────────────────────────────────────────────────────

export const SOURCES = [
  {
    id: 'mock_a', label: 'Archive Mock', shortLabel: 'Mock-A',
    country: 'XX', region: 'Mock', color: '#a0a0a0',
    searchFn: mockSearchFn(MOCK_DATA_A, 'mock_a'), enabled: true,
  },
  {
    id: 'mock_b', label: 'Library Mock', shortLabel: 'Mock-B',
    country: 'XX', region: 'Mock', color: '#707070',
    searchFn: mockSearchFn(MOCK_DATA_B, 'mock_b'), enabled: true,
  },
  {
    id: 'met', label: 'Metropolitan Museum of Art', shortLabel: 'Met',
    country: 'US', region: 'Americas', color: '#f39c12',
    searchFn: metSearchFn, enabled: true,
  },
  {
    id: 'loc', label: 'Library of Congress', shortLabel: 'LoC',
    country: 'US', region: 'Americas', color: '#1abc9c',
    searchFn: locSearchFn, enabled: true,
  },
  {
    id: 'trove', label: 'Trove (NLA)', shortLabel: 'Trove',
    country: 'AU', region: 'Oceania', color: '#2ecc71',
    searchFn: troveSearchFn, enabled: true,
    requiresKey: true,
  },
  {
    id: 'europeana', label: 'Europeana', shortLabel: 'Euro',
    country: 'EU', region: 'Europe', color: '#3498db',
    searchFn: europeanaSearchFn, enabled: true,
    requiresKey: true,
  },
  {
    id: 'rijksmuseum', label: 'Rijksmuseum', shortLabel: 'Rijks',
    country: 'NL', region: 'Europe', color: '#9b59b6',
    searchFn: rijksSearchFn, enabled: true,
    requiresKey: true,
  },
  {
    id: 'dpla', label: 'Digital Public Library of America', shortLabel: 'DPLA',
    country: 'US', region: 'Americas', color: '#e74c3c',
    searchFn: dplaSearchFn, enabled: true,
    requiresKey: true,
  },
]

export function getSource(id) {
  return SOURCES.find(s => s.id === id)
}

export function enabledSources() {
  return SOURCES.filter(s => s.enabled)
}
