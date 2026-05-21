import { useCallback, useEffect, useRef, useState } from "react"

import { client } from "../client"
import { getOpenRouterKey } from "./byok"

export type KeyHealth =
  | { status: "unknown" }
  | { status: "checking" }
  | { status: "healthy"; label: string | null }
  | { status: "invalid"; error: string }
  | { status: "low_balance"; usage: number | null; limit: number | null }
  | { status: "depleted" }

export interface KeyHealthResult {
  health: KeyHealth
  /** Manually re-run the validation (e.g. after regaining connectivity). */
  recheck: () => void
}

/**
 * Lightweight background check of the stored OpenRouter key. Fires once
 * on mount (app launch). Returns one of:
 *   - "unknown"    — no key configured, nothing to check
 *   - "checking"   — validation in flight
 *   - "healthy"    — key is valid and has headroom
 *   - "invalid"    — 401/403 (key dead)
 *   - "low_balance" — usage is within 20% of limit
 *   - "depleted"   — negative balance or usage >= limit
 *
 * Network failures are treated as "unknown" so the user doesn't get a
 * false "key invalid" banner when they're just offline.
 */
export function useKeyHealth(): KeyHealthResult {
  const [health, setHealth] = useState<KeyHealth>({ status: "unknown" })
  const cancelledRef = useRef(false)

  const check = useCallback(async () => {
    const key = await getOpenRouterKey()
    if (!key) {
      if (!cancelledRef.current) setHealth({ status: "unknown" })
      return
    }
    if (!cancelledRef.current) setHealth({ status: "checking" })

    try {
      const result = await client.openrouter.validateKey(key)
      if (cancelledRef.current) return

      if (!result.valid) {
        const isNetworkError =
          /network|fetch|timeout|connection|offline|internet|failed to fetch|could not connect/i.test(
            result.error ?? "",
          )
        if (isNetworkError) {
          setHealth({ status: "unknown" })
        } else {
          setHealth({ status: "invalid", error: result.error ?? "Key rejected" })
        }
        return
      }

      const info = result.info
      if (!info) {
        setHealth({ status: "healthy", label: null })
        return
      }

      if (info.limit != null && info.usage != null && info.usage >= info.limit) {
        setHealth({ status: "depleted" })
        return
      }

      if (info.limit != null && info.usage != null && info.usage >= info.limit * 0.8) {
        setHealth({ status: "low_balance", usage: info.usage, limit: info.limit })
        return
      }

      setHealth({ status: "healthy", label: info.label })
    } catch {
      if (!cancelledRef.current) {
        setHealth({ status: "unknown" })
      }
    }
  }, [])

  useEffect(() => {
    cancelledRef.current = false
    check()
    return () => {
      cancelledRef.current = true
    }
  }, [check])

  return { health, recheck: check }
}
