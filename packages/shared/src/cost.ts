import { getModel } from "./models.ts"
import type { ModelId, TokenUsage } from "./types.ts"

const MARKUP_MULTIPLIER = 1.3

export interface CostBreakdown {
  baseCents: number
  markupCents: number
  totalCents: number
}

export function calculateCost(model: ModelId, usage: TokenUsage): CostBreakdown {
  const spec = getModel(model)
  const inputCost = (usage.promptTokens / 1_000_000) * spec.inputCostPerMillion
  const outputCost = (usage.completionTokens / 1_000_000) * spec.outputCostPerMillion
  const baseDollars = inputCost + outputCost
  const totalDollars = baseDollars * MARKUP_MULTIPLIER

  const baseCents = Math.ceil(baseDollars * 100)
  const totalCents = Math.ceil(totalDollars * 100)
  return {
    baseCents,
    markupCents: totalCents - baseCents,
    totalCents,
  }
}

export function formatCents(cents: number): string {
  if (cents < 1) return `$${(cents / 100).toFixed(4)}`
  if (cents < 100) return `$${(cents / 100).toFixed(3)}`
  return `$${(cents / 100).toFixed(2)}`
}
