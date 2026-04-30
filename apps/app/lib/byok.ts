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

// ----------------------------------------------------------------------------
// Key validation — pings each provider's cheapest auth-check endpoint.
// All four providers expose a list-models or auth-info endpoint that returns
// 401/403 for invalid keys without spending tokens.
// ----------------------------------------------------------------------------

export interface ByokKeyInfo {
  label?: string | null
  /** Dollars consumed on this key (OpenRouter only). */
  usage?: number | null
  /** Dollar credit limit on the key, null = unlimited. (OpenRouter only.) */
  limit?: number | null
}

export interface ValidationResult {
  valid: boolean
  error?: string
  info?: ByokKeyInfo
}

async function validateOpenRouter(key: string): Promise<ValidationResult> {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (res.status === 401 || res.status === 403) {
      return { valid: false, error: "Invalid OpenRouter key" }
    }
    if (!res.ok) {
      return { valid: false, error: `HTTP ${res.status}: ${res.statusText}` }
    }
    const json = (await res.json()) as {
      data?: { label?: string; usage?: number; limit?: number | null }
    }
    return {
      valid: true,
      info: {
        label: json.data?.label ?? null,
        usage: json.data?.usage ?? null,
        limit: json.data?.limit ?? null,
      },
    }
  } catch (e) {
    return {
      valid: false,
      error: e instanceof Error ? e.message : "Network error",
    }
  }
}

async function validateAnthropic(key: string): Promise<ValidationResult> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
    })
    if (res.status === 401 || res.status === 403) {
      return { valid: false, error: "Invalid Anthropic key" }
    }
    if (!res.ok) return { valid: false, error: `HTTP ${res.status}` }
    return { valid: true }
  } catch (e) {
    return {
      valid: false,
      error: e instanceof Error ? e.message : "Network error",
    }
  }
}

async function validateOpenAI(key: string): Promise<ValidationResult> {
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (res.status === 401 || res.status === 403) {
      return { valid: false, error: "Invalid OpenAI key" }
    }
    if (!res.ok) return { valid: false, error: `HTTP ${res.status}` }
    return { valid: true }
  } catch (e) {
    return {
      valid: false,
      error: e instanceof Error ? e.message : "Network error",
    }
  }
}

async function validateGoogle(key: string): Promise<ValidationResult> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
    )
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      return { valid: false, error: "Invalid Google AI key" }
    }
    if (!res.ok) return { valid: false, error: `HTTP ${res.status}` }
    return { valid: true }
  } catch (e) {
    return {
      valid: false,
      error: e instanceof Error ? e.message : "Network error",
    }
  }
}

export async function validateKey(
  provider: ByokProvider,
  key: string,
): Promise<ValidationResult> {
  switch (provider.id) {
    case "openrouter":
      return validateOpenRouter(key)
    case "anthropic":
      return validateAnthropic(key)
    case "openai":
      return validateOpenAI(key)
    case "google":
      return validateGoogle(key)
    default:
      return { valid: false, error: "Unknown provider" }
  }
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
