import AsyncStorage from "@react-native-async-storage/async-storage"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"

import { DEFAULT_CURATED_MODEL_ID } from "@honestea/shared"

const STORAGE_KEY = "honestea:selected-model"

interface SelectedModelState {
  /** Currently active OpenRouter slug. */
  modelId: string
  /** Persist + broadcast a new selection. */
  setModelId: (next: string) => void
  /** False until AsyncStorage has been read. */
  ready: boolean
}

const Ctx = createContext<SelectedModelState | null>(null)

/**
 * Wraps the tree so every consumer of `useSelectedModel` reads the same
 * state. Without this, each `useState` call lived in its own component —
 * setting a model on the /models/[id] detail page didn't bubble up to the
 * chat header pill.
 *
 * Persists to AsyncStorage (not SecureStore — the model id is a preference,
 * not a secret). Accepts any non-empty slug; we don't pre-validate against
 * the registry because the registry isn't always loaded.
 */
export function SelectedModelProvider({
  children,
}: {
  children: React.ReactNode
}) {
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

  return (
    <Ctx.Provider value={{ modelId, setModelId, ready }}>
      {children}
    </Ctx.Provider>
  )
}

export function useSelectedModel(): SelectedModelState {
  const ctx = useContext(Ctx)
  if (!ctx) {
    throw new Error("useSelectedModel used outside SelectedModelProvider")
  }
  return ctx
}
