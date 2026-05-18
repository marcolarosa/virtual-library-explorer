import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface SearchResult {
  id: string
  title: string
  type?: string
  image?: string
  url?: string
  [key: string]: any
}

export interface Location {
  id: string
  label: string
  results: SearchResult[]
}

export const useLocationsStore = defineStore('locations', () => {
  const locations = ref<Map<string, Location>>(new Map())
  const currentQuery = ref<string>('')

  function addLocation(id: string, label: string): void {
    if (!locations.value.has(id)) {
      locations.value.set(id, { id, label, results: [] })
    }
  }

  function addResult(locationId: string, result: SearchResult): void {
    const location = locations.value.get(locationId)
    if (location && !location.results.some(r => r.id === result.id)) {
      location.results.push(result)
    }
  }

  function clearAllResults(): void {
    locations.value.forEach(location => {
      location.results = []
    })
  }

  function setCurrentQuery(query: string): void {
    currentQuery.value = query
  }

  return {
    locations,
    currentQuery,
    addLocation,
    addResult,
    clearAllResults,
    setCurrentQuery,
  }
})
