import AsyncStorage from "@react-native-async-storage/async-storage"
import { colorScheme } from "nativewind"
import { useEffect, useState } from "react"

export type ThemePreference = "system" | "light" | "dark"

const STORAGE_KEY = "honestea:theme"

function applyScheme(pref: ThemePreference) {
  colorScheme.set(pref)
}

/**
 * Read + persist the user's theme preference.
 *
 * - `system` follows the OS (default).
 * - `light` / `dark` override regardless of OS.
 * - Persisted in AsyncStorage so the choice survives app restarts.
 *
 * NativeWind's `colorScheme.set()` propagates the change to all `dark:`-prefixed
 * Tailwind classes immediately.
 */
export function useThemePreference(): readonly [
  ThemePreference,
  (next: ThemePreference) => void,
  boolean,
] {
  const [pref, setPref] = useState<ThemePreference>("system")
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === "light" || stored === "dark" || stored === "system") {
          setPref(stored)
          applyScheme(stored)
        }
      })
      .finally(() => setHydrated(true))
  }, [])

  const update = (next: ThemePreference) => {
    setPref(next)
    applyScheme(next)
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
      // ignore — non-critical
    })
  }

  return [pref, update, hydrated] as const
}
