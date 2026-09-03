import AsyncStorage from "@react-native-async-storage/async-storage"
import { useCallback, useEffect, useState } from "react"

import {
  pricePerMillionFromPerToken,
  type ModelPricing,
} from "@honestea/shared"

import { client } from "../client"

const STORAGE_KEY = "honestea:model-registry"
const MODEL_DETAIL_KEY = (id: string) => `honestea:model:${id}`
const TTL_STORAGE_KEY = "honestea:model-registry-ttl"
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000

/** Refresh-interval presets for the Settings row (label + ms). */
export const REGISTRY_TTL_OPTIONS = [
  { label: "Daily", ms: 24 * 60 * 60 * 1000 },
  { label: "Every 3 days", ms: 3 * 24 * 60 * 60 * 1000 },
  { label: "Weekly", ms: 7 * 24 * 60 * 60 * 1000 },
] as const

let cachedTtlMs: number | null = null

/** Load the user's refresh interval (defaults to daily). */
async function getTtlMs(): Promise<number> {
  if (cachedTtlMs != null) return cachedTtlMs
  try {
    const raw = await AsyncStorage.getItem(TTL_STORAGE_KEY)
    const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN
    const found = REGISTRY_TTL_OPTIONS.find((o) => o.ms === parsed)
    cachedTtlMs = found ? found.ms : DEFAULT_TTL_MS
  } catch {
    cachedTtlMs = DEFAULT_TTL_MS
  }
  return cachedTtlMs
}

/**
 * Cycle to the next refresh interval and persist it. Returns the new
 * option so the caller can reflect it in the UI immediately.
 */
export async function cycleRegistryTtl(): Promise<(typeof REGISTRY_TTL_OPTIONS)[number]> {
  const current = await getTtlMs()
  const idx = REGISTRY_TTL_OPTIONS.findIndex((o) => o.ms === current)
  const next = REGISTRY_TTL_OPTIONS[(idx + 1) % REGISTRY_TTL_OPTIONS.length]
  cachedTtlMs = next.ms
  try {
    await AsyncStorage.setItem(TTL_STORAGE_KEY, String(next.ms))
  } catch {
    // non-critical
  }
  return next
}

/** Current interval label — for the Settings row sub-label. */
export async function getRegistryTtlLabel(): Promise<string> {
  const ms = await getTtlMs()
  return REGISTRY_TTL_OPTIONS.find((o) => o.ms === ms)?.label ?? "Daily"
}

/**
 * Subset of the OpenRouter `/api/v1/models` response shape we actually use.
 * Mirrors fields from https://openrouter.ai/api/v1/models — kept loose
 * (lots of optional fields) because OR adds new modalities and price keys
 * over time.
 */
export interface RegistryModel {
  id: string
  name: string
  canonical_slug?: string
  description?: string
  created?: number
  context_length: number
  hugging_face_id?: string | null
  knowledge_cutoff?: string | null
  pricing: {
    prompt: string
    completion: string
    image?: string
    request?: string
    input_cache_read?: string
    input_cache_write?: string
    audio?: string
    audio_output?: string
    image_output?: string
    web_search?: string
    internal_reasoning?: string
  }
  architecture?: {
    modality?: string
    input_modalities?: string[]
    output_modalities?: string[]
    tokenizer?: string
  }
  /**
   * List of optional parameters this model accepts (e.g. "tools",
   * "tool_choice", "structured_outputs", "reasoning"). Used to gate the
   * web search toggle — OR's `openrouter:web_search` is delivered via the
   * `tools` parameter, so a model without "tools" in this list can't
   * search.
   */
  supported_parameters?: string[]
  top_provider?: {
    context_length?: number | null
    max_completion_tokens?: number | null
    is_moderated?: boolean
  }
}

interface RegistryCache {
  data: RegistryModel[]
  fetchedAt: number
}

let memoryCache: RegistryCache | null = null

async function fetchFromOpenRouter(): Promise<RegistryModel[]> {
  const json = await client.openrouter.models()
  return (json as { data: RegistryModel[] }).data
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

/** Write a single model to its own AsyncStorage slot for fast detail-screen
 *  lookups even when the bulk registry cache is stale or missing. */
async function saveModelDetail(model: RegistryModel): Promise<void> {
  try {
    await AsyncStorage.setItem(
      MODEL_DETAIL_KEY(model.id),
      JSON.stringify({ data: model, fetchedAt: Date.now() }),
    )
  } catch {
    // non-critical
  }
}

/** Load a single model from its individual cache slot. Returns null when
 *  the slot is empty or unreadable. */
export async function loadModelDetail(
  modelId: string,
): Promise<{ model: RegistryModel; fetchedAt: number } | null> {
  try {
    const raw = await AsyncStorage.getItem(MODEL_DETAIL_KEY(modelId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as { data: RegistryModel; fetchedAt: number }
    return { model: parsed.data, fetchedAt: parsed.fetchedAt }
  } catch {
    return null
  }
}

/**
 * Force a network fetch of the OpenRouter catalog, updating the memory
 * and disk caches and notifying every mounted `useModelRegistry` screen.
 * The manual "Refresh" path — bypasses the TTL. Throws on network
 * failure so the caller can surface it.
 *
 * Note: doesn't rewrite the per-model detail slots. Detail screens prefer
 * the in-memory registry anyway; the disk slots are a cold-start cache
 * that the next full `loadRegistry()` repopulates.
 */
export async function refreshRegistry(): Promise<RegistryModel[]> {
  const fresh = await fetchFromOpenRouter()
  const now = Date.now()
  memoryCache = { data: fresh, fetchedAt: now }
  await saveToAsyncStorage(fresh)
  for (const listener of registryListeners) listener(fresh)
  return fresh
}

// Cross-screen propagation: `useModelRegistry` instances live in each
// screen, so a refresh from Settings must reach the already-mounted chat
// screen too.
const registryListeners = new Set<(data: RegistryModel[]) => void>()

/**
 * Loads the model registry, preferring fresh > stale > empty.
 *
 * - If memory cache is fresh (within the configured TTL), return it
 * - Else if disk cache is fresh, hydrate memory + return
 * - Else fetch from OpenRouter, save to disk, return
 * - On network failure, fall back to stale disk cache if any
 */
export async function loadRegistry(): Promise<RegistryModel[]> {
  const ttl = await getTtlMs()
  if (memoryCache && Date.now() - memoryCache.fetchedAt < ttl) {
    return memoryCache.data
  }

  const disk = await loadFromAsyncStorage()
  if (disk && Date.now() - disk.fetchedAt < ttl) {
    memoryCache = disk
    return disk.data
  }

  try {
    return await refreshRegistry()
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

export interface ModelRegistryState {
  ready: boolean
  registry: RegistryModel[] | null
  error: string | null
  /** true when the loaded data came from disk and is past its TTL
   *  (network fetch failed). The UI can surface a "prices may be stale"
   *  nudge. */
  isStale: boolean
  /** Timestamp (ms) of the most recent successful network fetch, or the
   *  disk cache timestamp when falling back to stale data. */
  fetchedAt: number | null
  /** Force a network refresh. Rejects on failure — callers toast. */
  refresh: () => Promise<void>
}

/**
 * Hydrate the registry on mount. Returns `{ ready, registry, error, isStale,
 * fetchedAt, refresh }` so screens can render loading / fallback / stale
 * states cleanly and force a re-fetch.
 */
export function useModelRegistry(): ModelRegistryState {
  const [registry, setRegistry] = useState<RegistryModel[] | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isStale, setIsStale] = useState(false)
  const [fetchedAt, setFetchedAt] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    loadRegistry()
      .then((data) => {
        if (cancelled) return
        setRegistry(data)
        setIsStale(false)
        setFetchedAt(memoryCache?.fetchedAt ?? null)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : "load failed")
        setIsStale(false)
      })
      .finally(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const refresh = useCallback(async () => {
    const data = await refreshRegistry()
    setRegistry(data)
    setError(null)
    setIsStale(false)
    setFetchedAt(memoryCache?.fetchedAt ?? null)
  }, [])

  // Hear about refreshes triggered from other screens.
  useEffect(() => {
    const onUpdate = (data: RegistryModel[]) => {
      setRegistry(data)
      setError(null)
      setIsStale(false)
      setFetchedAt(memoryCache?.fetchedAt ?? null)
    }
    registryListeners.add(onUpdate)
    return () => {
      registryListeners.delete(onUpdate)
    }
  }, [])

  return { ready, registry, error, isStale, fetchedAt, refresh }
}
