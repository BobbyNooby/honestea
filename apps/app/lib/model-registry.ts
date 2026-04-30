import AsyncStorage from "@react-native-async-storage/async-storage"
import { useEffect, useState } from "react"

import {
  pricePerMillionFromPerToken,
  type ModelPricing,
} from "@honestea/shared"

const STORAGE_KEY = "honestea:model-registry"
const TTL_MS = 24 * 60 * 60 * 1000

/**
 * Subset of the OpenRouter `/api/v1/models` response shape we actually use.
 */
export interface RegistryModel {
  id: string
  name: string
  context_length: number
  pricing: {
    prompt: string
    completion: string
    image?: string
    request?: string
  }
  architecture?: {
    modality?: string
  }
}

interface RegistryCache {
  data: RegistryModel[]
  fetchedAt: number
}

let memoryCache: RegistryCache | null = null

async function fetchFromOpenRouter(): Promise<RegistryModel[]> {
  const res = await fetch("https://openrouter.ai/api/v1/models")
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = (await res.json()) as { data: RegistryModel[] }
  return json.data
}

async function loadFromAsyncStorage(): Promise<RegistryCache | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as RegistryCache
  } catch {
    return null
  }
}

async function saveToAsyncStorage(data: RegistryModel[]): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ data, fetchedAt: Date.now() } satisfies RegistryCache),
    )
  } catch {
    // non-critical
  }
}

/**
 * Loads the model registry, preferring fresh > stale > empty.
 *
 * - If memory cache is fresh, return it
 * - Else if disk cache is fresh, hydrate memory + return
 * - Else fetch from OpenRouter, save to disk, return
 * - On network failure, fall back to stale disk cache if any
 */
export async function loadRegistry(): Promise<RegistryModel[]> {
  if (memoryCache && Date.now() - memoryCache.fetchedAt < TTL_MS) {
    return memoryCache.data
  }

  const disk = await loadFromAsyncStorage()
  if (disk && Date.now() - disk.fetchedAt < TTL_MS) {
    memoryCache = disk
    return disk.data
  }

  try {
    const fresh = await fetchFromOpenRouter()
    memoryCache = { data: fresh, fetchedAt: Date.now() }
    await saveToAsyncStorage(fresh)
    return fresh
  } catch (e) {
    if (disk) {
      memoryCache = disk
      return disk.data
    }
    throw e
  }
}

export function findModel(
  registry: readonly RegistryModel[],
  modelId: string,
): RegistryModel | undefined {
  return registry.find((m) => m.id === modelId)
}

export function pricingFor(model: RegistryModel): ModelPricing {
  return {
    inputCostPerMillion: pricePerMillionFromPerToken(model.pricing.prompt),
    outputCostPerMillion: pricePerMillionFromPerToken(model.pricing.completion),
  }
}

/**
 * Hydrate the registry on mount. Returns `{ ready, registry, error }` so
 * screens can render loading / fallback / data states cleanly.
 */
export function useModelRegistry() {
  const [registry, setRegistry] = useState<RegistryModel[] | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadRegistry()
      .then((data) => {
        if (!cancelled) setRegistry(data)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "load failed")
      })
      .finally(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { ready, registry, error }
}
