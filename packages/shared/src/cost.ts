/**
 * Pricing for a single model. Either fetched dynamically from OpenRouter
 * (`/api/v1/models`) or computed elsewhere. Prices are stored *per million
 * tokens* — convert from OpenRouter's per-token strings via
 * `pricePerMillionFromPerToken()`.
 */
export interface ModelPricing {
  inputCostPerMillion: number
  outputCostPerMillion: number
}

/**
 * Convert a per-token-as-string price (OpenRouter format) to per-million-tokens.
 * Example: "0.000003" → 3.0
 */
export function pricePerMillionFromPerToken(perToken: string | number): number {
  const n = typeof perToken === "string" ? Number.parseFloat(perToken) : perToken
  if (!Number.isFinite(n)) return 0
  return n * 1_000_000
}

/**
 * Rough heuristic: ~4 characters per token for English. Used for client-side
 * estimation when actual usage isn't returned by the streaming response —
 * almost never these days now that real `usage` lands on every OR turn.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Format a USD float with precision proportional to magnitude:
 *   < $0.01 → 4 decimals  ($0.0003)
 *   < $1    → 3 decimals  ($0.024)
 *   ≥ $1    → 2 decimals  ($1.23)
 *
 * Used for OpenRouter `usage.cost` (real float) — preserves sub-cent
 * detail.
 */
export function formatUsd(usd: number): string {
  if (usd < 0.01) return `$${usd.toFixed(4)}`
  if (usd < 1) return `$${usd.toFixed(3)}`
  return `$${usd.toFixed(2)}`
}
