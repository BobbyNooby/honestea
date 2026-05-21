import { useEffect, useState } from "react"

import { client } from "../client"
import { getOpenRouterKey } from "./byok"

export type KeyHealth =
  | { status: "unknown" }
  | { status: "checking" }
  | { status: "healthy"; label: string | null }
  | { status: "invalid"; error: string }
  | { status: "low_balance"; usage: number | null; limit: number | null }
  | { status: "depleted" }

/**
 * Lightweight background check of the stored OpenRouter key. Fires once
 * on mount (app launch). Returns one of:
 *   - "unknown"    — no key configured, nothing to check
 *   - "checking"   — validation in flight
 *   - "healthy"    — key is valid and has headroom
 *   - "invalid"    — 401/403 or network failure (key dead or no connectivity)
 *   - "low_balance" — usage is within 20% of limit (or limit known and usage high)
 *   - "depleted"   — negative balance or usage >= limit
 *
 * The chat screen can read this and show a red dot on the settings gear,
 * a toast on first open, or an inline banner.
 */
export function useKeyHealth(): KeyHealth {
  const [health, setHealth] = useState<KeyHealth>({ status: "unknown" })

  useEffect(() => {
    let cancelled = false

    async function check() {
      const key = await getOpenRouterKey()
      if (!key) {
        if (!cancelled) setHealth({ status: "unknown" })
        return
      }
      if (!cancelled) setHealth({ status: "checking" })

      try {
        const result = await client.openrouter.validateKey(key)
        if (cancelled) return

        if (!result.valid) {
          setHealth({ status: "invalid", error: result.error ?? "Key rejected" })
          return
        }

        const info = result.info
        if (!info) {
          setHealth({ status: "healthy", label: null })
          return
        }

        // Depleted: OR returns 402 on every request when balance < 0
        if (
          info.limit != null &&
          info.usage != null &&
          info.usage >= info.limit
        ) {
          setHealth({ status: "depleted" })
          return
        }

        // Low balance: within 20% of limit or free-tier with high usage
        if (
          info.limit != null &&
          info.usage != null &&
          info.usage >= info.limit * 0.8
        ) {
          setHealth({ status: "low_balance", usage: info.usage, limit: info.limit })
          return
        }

        setHealth({ status: "healthy", label: info.label })
      } catch {
        if (!cancelled) {
          // Network failure during check — treat as unknown so we don't
          // nag the user when they're just offline.
          setHealth({ status: "unknown" })
        }
      }
    }

    check()
    return () => {
      cancelled = true
    }
  }, [])

  return health
}
