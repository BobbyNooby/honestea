import * as Network from "expo-network"
import { useEffect, useState } from "react"

/**
 * Lightweight connectivity status. Checks on mount and updates whenever
 * the app comes to the foreground (no real-time listener in expo-network,
 * so we re-poll on focus).
 *
 * `isConnected` is true when the device reports an active network interface
 * (wifi, cellular, etc). It does NOT guarantee the internet is actually
 * reachable — a captive portal or downed upstream will still report true.
 * For that, rely on API call failures + the stale-cache indicator.
 */
export interface NetworkStatus {
  /** true when a network interface is up. */
  isConnected: boolean
  /** "wifi" | "cellular" | "none" | "unknown" | "bluetooth" | "ethernet" | "wimax" | "other" */
  type: Network.NetworkStateType
  /** true while the initial check is running. */
  checking: boolean
}

export function useNetworkStatus(): NetworkStatus {
  const [state, setState] = useState<NetworkStatus>({
    isConnected: true,
    type: Network.NetworkStateType.UNKNOWN,
    checking: true,
  })

  useEffect(() => {
    let cancelled = false

    async function check() {
      try {
        const networkState = await Network.getNetworkStateAsync()
        if (cancelled) return
        setState({
          isConnected: networkState.isConnected ?? false,
          type: networkState.type ?? Network.NetworkStateType.UNKNOWN,
          checking: false,
        })
      } catch {
        if (cancelled) return
        setState({
          isConnected: true,
          type: Network.NetworkStateType.UNKNOWN,
          checking: false,
        })
      }
    }

    check()
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
