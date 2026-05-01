import AsyncStorage from "@react-native-async-storage/async-storage"
import { useCallback, useEffect, useState } from "react"

import { DEFAULT_CURATED_MODEL_ID } from "@honestea/shared"

const STORAGE_KEY = "honestea:selected-model"

/**
 * Tracks which model the user has chosen for chat. Persisted to
 * AsyncStorage (not SecureStore — model ID isn't a secret, just a preference).
 *
 * Any non-empty OpenRouter slug is accepted — selections from the curated
 * picker AND the full /models browse page both flow through here. If OR
 * later drops a model the slug will start failing at request time; we don't
 * pre-validate here because the registry isn't always loaded.
 */
export function useSelectedModel() {
  const [modelId, setModelIdState] = useState<string>(DEFAULT_CURATED_MODEL_ID)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (cancelled) return
      if (stored && stored.length > 0) setModelIdState(stored)
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
