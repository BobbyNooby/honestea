/**
 * Display helpers shared between the model selector + the /models browse
 * and detail screens. Kept here so all three pickers format the same way
 * — context windows, prices, and provider derivations were duplicated
 * across three files before this lived together.
 */

import { pricePerMillionFromPerToken } from "@honestea/shared"

/** "anthropic/claude-haiku-4.5" → "anthropic". Falls back to the full id
 *  for slugs without a `/` (rare — most OR slugs are namespaced). */
export function providerFromId(id: string): string {
  const slash = id.indexOf("/")
  return slash === -1 ? id : id.slice(0, slash)
}

/** 200000 → "200K", 1_048_576 → "1.05M". Tail zeros trimmed. */
export function formatContext(n: number): string {
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`
  return String(n)
}

/**
 * Per-million-tokens price string. Precision scales with magnitude so
 * cheap-model prices stay readable ($0.0003) without blowing up flagship
 * prices ($25). Trailing zeros stripped.
 */
export function formatPricePerMillion(usd: number): string {
  if (usd === 0) return "$0"
  if (usd < 0.01) return `$${usd.toFixed(4).replace(/\.?0+$/, "")}`
  if (usd < 1) return `$${usd.toFixed(3).replace(/\.?0+$/, "")}`
  if (usd < 10) return `$${usd.toFixed(2)}`
  return `$${Math.round(usd)}`
}

/** Generic dollar formatter for non-per-million prices (e.g. per-request). */
export function formatRawUsd(n: number): string {
  if (n < 0.01) return `$${n.toFixed(4).replace(/\.?0+$/, "")}`
  if (n < 1) return `$${n.toFixed(3).replace(/\.?0+$/, "")}`
  return `$${n.toFixed(2)}`
}

/** Unix-seconds timestamp from OR's `created` field → "May 1, 2026". */
export function formatCreated(unix?: number): string | null {
  if (!unix) return null
  const d = new Date(unix * 1000)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export interface PriceParts {
  inputUsd: number
  outputUsd: number
}

/**
 * Pull per-million input + output prices off an OR registry pricing
 * record in one shot. Centralizes the `pricePerMillionFromPerToken`
 * conversion so callers don't have to repeat it.
 */
export function pricePartsFromPricing(pricing: {
  prompt: string
  completion: string
}): PriceParts {
  return {
    inputUsd: pricePerMillionFromPerToken(pricing.prompt),
    outputUsd: pricePerMillionFromPerToken(pricing.completion),
  }
}
