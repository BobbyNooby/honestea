import AsyncStorage from "@react-native-async-storage/async-storage"
import { useEffect, useState } from "react"

/**
 * Tracks whether the user has completed the first-launch flow. Backed by
 * AsyncStorage (non-secret, just a UX flag). Set by the onboarding
 * screen once the user picks Free or Paid; checked by the root layout to
 * decide whether to redirect on entry.
 *
 * Stored as a presence-check ("1" written when seen) rather than a
 * timestamp — we only care whether to show the screen, not when.
 */

const KEY = "honestea.onboarding_seen_v1"

export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(KEY)
    return v === "1"
  } catch {
    // AsyncStorage failures shouldn't block the app — treat as "seen" so
    // we don't trap the user in an onboarding loop on a flaky device.
    return true
  }
}

export async function markOnboardingSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, "1")
  } catch {
    // Best-effort; same reasoning as above.
  }
}

/**
 * Clears the seen-flag so the onboarding screen shows again on next
 * mount. Called from the Developer section of Settings (Show
 * onboarding again) and from manual data wipes.
 */
export async function resetOnboarding(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY)
  } catch {
    // Best-effort.
  }
}

/**
 * Hook variant for the root layout: returns `null` while the flag is
 * loading so we don't flash the chat screen before deciding whether to
 * redirect.
 */
export function useOnboardingSeen(): boolean | null {
  const [seen, setSeen] = useState<boolean | null>(null)
  useEffect(() => {
    let cancelled = false
    hasSeenOnboarding().then((v) => {
      if (!cancelled) setSeen(v)
    })
    return () => {
      cancelled = true
    }
  }, [])
  return seen
}
