import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface SourceStatus {
  status: 'idle' | 'querying' | 'done' | 'error'
  count: number
  latency: number | null
  proxyUsed?: boolean
  error?: string
}

export const useSourcesStore = defineStore('sources', () => {
  const statuses = ref<Map<string, SourceStatus>>(new Map())

  function setStatus(sourceId: string, update: Partial<SourceStatus>): void {
    const current = statuses.value.get(sourceId) || {}
    statuses.value.set(sourceId, { ...current, ...update } as SourceStatus)
  }

  function getStatus(sourceId: string): SourceStatus {
    return statuses.value.get(sourceId) || { status: 'idle', count: 0, latency: 0, proxyUsed: false }
  }

  function initializeSource(sourceId: string): void {
    if (!statuses.value.has(sourceId)) {
      setStatus(sourceId, { status: 'idle', count: 0, latency: 0, proxyUsed: false, error: undefined })
    }
  }

  function resetAll(): void {
    statuses.value.clear()
  }

  return { statuses, setStatus, getStatus, initializeSource, resetAll }
})
