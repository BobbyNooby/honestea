import { MODELS } from "./models"
import type { ModelId, TokenUsage } from "./types"

const MARKUP_MULTIPLIER = 1.3

export interface CostBreakdown {
  baseCents: number
  markupCents: number
  totalCents: number
}

/**
 * Pricing for a single model. Either fetched dynamically from OpenRouter
 * (`/api/v1/models`) or sourced from the static MODELS registry.
 *
 * Note that prices are stored *per million tokens* — convert from OpenRouter's
 * per-token strings via `pricePerMillionFromPerToken()`.
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
 * Calculate cost from explicit pricing. Used when pricing comes from a dynamic
 * source (the cached OpenRouter registry).
 */
export function calculateCost(
  pricing: ModelPricing,
  usage: TokenUsage,
): CostBreakdown {
  const inputDollars =
    (usage.promptTokens / 1_000_000) * pricing.inputCostPerMillion
  const outputDollars =
    (usage.completionTokens / 1_000_000) * pricing.outputCostPerMillion
  const baseDollars = inputDollars + outputDollars
  const totalDollars = baseDollars * MARKUP_MULTIPLIER

  const baseCents = Math.ceil(baseDollars * 100)
  const totalCents = Math.ceil(totalDollars * 100)
  return {
    baseCents,
    markupCents: totalCents - baseCents,
    totalCents,
  }
}

/**
 * Convenience wrapper: look up pricing in the static registry by ModelId.
 * Use this for quick checks against models we have hardcoded; for the live
 * catalog from OpenRouter, call `calculateCost(pricing, usage)` directly.
 */
export function calculateCostForModel(
  modelId: ModelId,
  usage: TokenUsage,
): CostBreakdown {
  const spec = MODELS[modelId]
  if (!spec) throw new Error(`Unknown model: ${modelId}`)
  return calculateCost(
    {
      inputCostPerMillion: spec.inputCostPerMillion,
      outputCostPerMillion: spec.outputCostPerMillion,
    },
    usage,
  )
}

/**
 * Rough heuristic: ~4 characters per token for English. Used for client-side
 * estimation when actual usage isn't returned by the streaming response.
 * Replace with real `usage` from the API when we wire `onFinish` end-to-end.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export function formatCents(cents: number): string {
  if (cents < 1) return `$${(cents / 100).toFixed(4)}`
  if (cents < 100) return `$${(cents / 100).toFixed(3)}`
  return `$${(cents / 100).toFixed(2)}`
}
