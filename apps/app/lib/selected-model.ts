import AsyncStorage from "@react-native-async-storage/async-storage"
import { useCallback, useEffect, useState } from "react"

import { CURATED_MODELS, DEFAULT_CURATED_MODEL_ID } from "@honestea/shared"

const STORAGE_KEY = "honestea:selected-model"

const VALID_IDS = new Set(CURATED_MODELS.map((m) => m.id))

/**
 * Tracks which curated model the user has chosen for chat. Persisted to
 * AsyncStorage (not SecureStore — model ID isn't a secret, just a preference).
 *
 * If a stored ID is no longer in the curated list (e.g. a build dropped a
 * model), we fall back to the default rather than silently sending an
 * unsupported slug to OpenRouter.
 */
export function useSelectedModel() {
  const [modelId, setModelIdState] = useState<string>(DEFAULT_CURATED_MODEL_ID)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (cancelled) return
      if (stored && VALID_IDS.has(stored)) setModelIdState(stored)
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const setModelId = useCallback((next: string) => {
    setModelIdState(next)
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {})
  }, [])

  return { modelId, setModelId, ready }
}
