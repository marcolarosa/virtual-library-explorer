import { useLocationsStore } from '../stores/locations'
import { useSourcesStore } from '../stores/sources'
import { useUIStore } from '../stores/ui'
import { enabledSources } from '../sources'

export async function runSearch(query: string): Promise<void> {
  const locationsStore = useLocationsStore()
  const sourcesStore = useSourcesStore()
  const uiStore = useUIStore()

  query = query.trim()
  if (!query) return

  locationsStore.clearAllResults()
  locationsStore.setCurrentQuery(query)
  uiStore.clearSelection()
  uiStore.searchInProgress = true

  const sources = enabledSources()
  const promises = sources.map(source => runSourceQuery(query, source))
  await Promise.allSettled(promises)

  uiStore.searchInProgress = false
}

async function runSourceQuery(query: string, source: any): Promise<void> {
  const locationsStore = useLocationsStore()
  const sourcesStore = useSourcesStore()

  const t0 = Date.now()
  sourcesStore.setStatus(source.id, { status: 'querying', count: 0, latency: null, proxyUsed: false })

  locationsStore.addLocation(source.id, source.label)

  try {
    const { docs, total } = await source.searchFn({ query })
    const latency = Date.now() - t0

    for (const result of docs) {
      locationsStore.addResult(source.id, {
        id: result.id,
        title: result.title,
        type: result.type,
        image: result.image,
        url: result.url,
        ...result,
      })
    }

    sourcesStore.setStatus(source.id, {
      status: 'done',
      count: total,
      latency,
      proxyUsed: false,
    })
  } catch (err) {
    const latency = Date.now() - t0
    console.warn(`[${source.id}] error:`, err instanceof Error ? err.message : 'Unknown error')
    sourcesStore.setStatus(source.id, { status: 'error', count: 0, latency, error: err instanceof Error ? err.message : 'Unknown error' })
  }
}
