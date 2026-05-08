import {
  findModel,
  type RegistryModel,
} from "@/lib/model"
import type { UsageTotals } from "@/lib/db/repository"

/**
 * Counterfactual-cost math for the usage screen. Given the user's
 * actual prompt + completion token totals, compute what the same
 * conversation volume would have cost on a few popular flagships.
 * Lets us frame transparency as "you spent $X. Same chats on Opus
 * would have cost $Y." rather than just showing a raw spend number.
 *
 * Comparison set is the current top-of-line from the three big labs.
 * Slugs are the OpenRouter canonical IDs; if a slug isn't in the
 * registry yet (e.g. a model's been retired or renamed) we just skip
 * it — the section keeps rendering with whatever's available.
 */

export interface ComparisonModel {
  slug: string
  /** Human-readable name shown on the row. */
  display: string
  /** Short label for the lab — "Anthropic", "OpenAI", "Google". */
  lab: string
}

/**
 * Slugs to look up in the OR registry. Update when a new flagship
 * displaces the current one. Keep this short — three rows is enough
 * signal; more becomes noise on a phone screen.
 */
export const COMPARISON_MODELS: readonly ComparisonModel[] = [
  {
    slug: "anthropic/claude-opus-4.7",
    display: "Claude Opus 4.7",
    lab: "Anthropic",
  },
  { slug: "openai/gpt-5.5", display: "GPT-5.5", lab: "OpenAI" },
  { slug: "google/gemini-3.5-pro", display: "Gemini 3.5 Pro", lab: "Google" },
] as const

export interface CounterfactualRow {
  model: ComparisonModel
  /** What the same token volume would have cost on this model. */
  hypotheticalCostUsd: number
  /** `hypothetical - actual`. Positive = saved; negative = would have been cheaper. */
  savedUsd: number
  /** Multiplier vs what the user actually paid. >1 = comparison is more expensive. */
  multiplier: number
}

/**
 * Resolves comparison-model slugs against the registry, prices the
 * user's totals on each, and returns the savings rows. Skips any
 * comparison model that isn't in the registry (registry not loaded
 * yet, slug renamed, etc.) — the empty case is "nothing to show",
 * not an error.
 */
export function buildCounterfactuals(
  totals: UsageTotals,
  registry: RegistryModel[] | null,
): CounterfactualRow[] {
  if (!registry) return []
  const rows: CounterfactualRow[] = []
  for (const cmp of COMPARISON_MODELS) {
    const model = findModel(registry, cmp.slug)
    if (!model) continue
    const hypothetical = priceTokens(
      totals.totalPromptTokens,
      totals.totalCompletionTokens,
      model,
    )
    if (hypothetical == null) continue
    rows.push({
      model: cmp,
      hypotheticalCostUsd: hypothetical,
      savedUsd: hypothetical - totals.totalCostUsd,
      multiplier:
        totals.totalCostUsd > 0
          ? hypothetical / totals.totalCostUsd
          : Number.POSITIVE_INFINITY,
    })
  }
  return rows
}

/**
 * OR's `pricing.prompt` and `pricing.completion` are dollar-per-token
 * strings (e.g. "0.000003" for Haiku). Multiply token totals by them.
 * Returns null if the model has no pricing entries — happens for a
 * handful of test/local models.
 */
function priceTokens(
  promptTokens: number,
  completionTokens: number,
  model: RegistryModel,
): number | null {
  const inPer = parseFloat(model.pricing.prompt)
  const outPer = parseFloat(model.pricing.completion)
  if (!Number.isFinite(inPer) || !Number.isFinite(outPer)) return null
  return promptTokens * inPer + completionTokens * outPer
}
