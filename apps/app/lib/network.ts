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

export interface NetworkState {
  /** true when a network interface is up. */
  isConnected: boolean
  type: NetworkType
  /** true while the initial check is running. */
  checking: boolean
}

const HEARTBEAT_MS = 5000

/**
 * Lightweight connectivity status with a 5-second heartbeat.
 *
 * Checks immediately on mount, then polls every 5s while the component
 * is mounted. This means the offline banner appears / disappears in real
 * time as the user toggles airplane mode or walks out of wifi range.
 *
 * When expo-network isn't available (e.g. Expo Go without a rebuild),
 * returns `{ isConnected: true, type: "unknown", checking: false }`.
 */
export function useNetworkStatus(): NetworkState {
  const [state, setState] = useState<NetworkState>({
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
    const interval = setInterval(check, HEARTBEAT_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return state
}
