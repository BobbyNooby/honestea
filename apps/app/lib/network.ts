import { useEffect, useState } from "react"

// Gracefully handle expo-network not being available in the current
// Expo Go build (needs a native rebuild or Metro restart). Falls back
// to "assume connected" so the app doesn't crash on missing native code.
let Network: typeof import("expo-network") | null = null
try {
  Network = require("expo-network")
} catch {
  // expo-network native module not linked — treat as always online.
}

export type NetworkType =
  | "none"
  | "wifi"
  | "cellular"
  | "bluetooth"
  | "ethernet"
  | "wimax"
  | "other"
  | "unknown"

/**
 * Lightweight connectivity status. Checks on mount.
 *
 * When expo-network isn't available (e.g. Expo Go without a rebuild),
 * returns `{ isConnected: true, type: "unknown", checking: false }` so
 * the app continues to work and the user just doesn't get the offline
 * banner.
 */
export interface NetworkStatus {
  /** true when a network interface is up. */
  isConnected: boolean
  type: NetworkType
  /** true while the initial check is running. */
  checking: boolean
}

export function useNetworkStatus(): NetworkStatus {
  const [state, setState] = useState<NetworkStatus>({
    isConnected: true,
    type: "unknown",
    checking: true,
  })

  useEffect(() => {
    let cancelled = false

    async function check() {
      if (!Network) {
        if (!cancelled) {
          setState({ isConnected: true, type: "unknown", checking: false })
        }
        return
      }

      try {
        const networkState = await Network.getNetworkStateAsync()
        if (cancelled) return
        setState({
          isConnected: networkState.isConnected ?? false,
          type: ((networkState.type as unknown) as NetworkType) ?? "unknown",
          checking: false,
        })
      } catch {
        if (!cancelled) {
          setState({ isConnected: true, type: "unknown", checking: false })
        }
      }
    }

    check()
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
