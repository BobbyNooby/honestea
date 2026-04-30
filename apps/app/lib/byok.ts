import { useFocusEffect } from "expo-router"
import * as SecureStore from "expo-secure-store"
import { useCallback, useState } from "react"

/**
 * BYOK provider configuration. Keys are stored encrypted via expo-secure-store
 * (iOS Keychain / Android Keystore). They never go to AsyncStorage.
 */

export interface ByokProvider {
  id: string
  name: string
  /** Storage key under expo-secure-store. */
  storageKey: string
  /** Where the user creates an API key. */
  signupUrl: string
  /** Hint shown in the input placeholder. */
  keyFormat: string
  /** Short tagline shown under the provider name. */
  description: string
  /** True for the recommended path. */
  recommended?: boolean
}

export const BYOK_PROVIDERS: readonly ByokProvider[] = [
  {
    id: "openrouter",
    name: "OpenRouter",
    storageKey: "byok_openrouter",
    signupUrl: "https://openrouter.ai/keys",
    keyFormat: "sk-or-v1-...",
    description: "One key, every model. Recommended.",
    recommended: true,
  },
  {
    id: "anthropic",
    name: "Anthropic",
    storageKey: "byok_anthropic",
    signupUrl: "https://console.anthropic.com/settings/keys",
    keyFormat: "sk-ant-api03-...",
    description: "Direct Claude access — no markup, prompt caching enabled.",
  },
  {
    id: "openai",
    name: "OpenAI",
    storageKey: "byok_openai",
    signupUrl: "https://platform.openai.com/api-keys",
    keyFormat: "sk-proj-...",
    description: "Direct GPT access — supports vision, voice, structured outputs.",
  },
  {
    id: "google",
    name: "Google AI",
    storageKey: "byok_google",
    signupUrl: "https://aistudio.google.com/apikey",
    keyFormat: "AIza...",
    description: "Direct Gemini access — long context, multimodal.",
  },
] as const

export type ByokProviderId = (typeof BYOK_PROVIDERS)[number]["id"]

export async function getKey(provider: ByokProvider): Promise<string | null> {
  return SecureStore.getItemAsync(provider.storageKey)
}

export async function setKey(
  provider: ByokProvider,
  value: string,
): Promise<void> {
  await SecureStore.setItemAsync(provider.storageKey, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED,
  })
}

export async function deleteKey(provider: ByokProvider): Promise<void> {
  await SecureStore.deleteItemAsync(provider.storageKey)
}

/**
 * Returns the key for the OpenRouter BYOK path, if one is stored.
 * This is what the chat client checks to decide BYOK vs hosted routing.
 */
export async function getOpenRouterKey(): Promise<string | null> {
  return SecureStore.getItemAsync("byok_openrouter")
}

export interface ByokStatus {
  /** null = still loading, otherwise true/false. */
  ready: boolean
  /** true if at least one provider key is configured. */
  hasAnyKey: boolean
  /** true specifically for the OpenRouter key (the only one wired into chat today). */
  hasOpenRouter: boolean
}

/**
 * Tracks BYOK key status with a re-check on screen focus, so returning from
 * the /byok page reflects newly-saved or removed keys without a manual reload.
 */
export function useByokStatus(): ByokStatus {
  const [state, setState] = useState<ByokStatus>({
    ready: false,
    hasAnyKey: false,
    hasOpenRouter: false,
  })

  useFocusEffect(
    useCallback(() => {
      let cancelled = false
      Promise.all(BYOK_PROVIDERS.map((p) => getKey(p))).then((keys) => {
        if (cancelled) return
        const next: ByokStatus = {
          ready: true,
          hasAnyKey: keys.some((k) => !!k),
          hasOpenRouter: !!keys[BYOK_PROVIDERS.findIndex((p) => p.id === "openrouter")],
        }
        setState(next)
      })
      return () => {
        cancelled = true
      }
    }, []),
  )

  return state
}
