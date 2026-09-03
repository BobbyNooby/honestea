import type { ModelPricing } from "./cost"

/**
 * Capability-based model routing. Pure functions over the OpenRouter
 * catalog shape so the mobile app (and any future consumer) can resolve
 * the cheapest model that can actually handle a turn.
 *
 * These deliberately accept a structural subset of the registry model —
 * callers pass their full registry entries and TS structural typing does
 * the rest.
 */

/** The special picker entry that resolves to a concrete model per send. */
export const AUTO_MODEL_ID = "auto"

/** Structural subset of an OpenRouter `/models` entry the router needs. */
export interface RoutableModel {
  id: string
  context_length: number
  pricing: {
    prompt: string | number
    completion: string | number
  }
  architecture?: {
    input_modalities?: string[]
  }
  supported_parameters?: string[]
}

/** What the upcoming turn requires from a model. */
export interface CapabilityRequirements {
  /** Turn carries image attachments — needs vision input. */
  vision?: boolean
  /** Web search / tools enabled — needs `tools` in supported_parameters. */
  tools?: boolean
  /** Projected prompt size in tokens. Defaults to 0. */
  minContext?: number
}

function perToken(n: string | number): number {
  const v = typeof n === "string" ? Number.parseFloat(n) : n
  return Number.isFinite(v) ? v : NaN
}

/**
 * Blended cost per million tokens, weighting 3 input : 1 output tokens —
 * a reasonable shape for chat turns. Input is OpenRouter's per-token
 * price strings; output is per-million (matches `ModelPricing` scale).
 * Only used for RANKING candidates; displayed costs always come from
 * real `usage`.
 */
export function blendedPricePerMillion(pricing: {
  prompt: string | number
  completion: string | number
}): number {
  const inUsd = perToken(pricing.prompt)
  const outUsd = perToken(pricing.completion)
  if (!Number.isFinite(inUsd) || !Number.isFinite(outUsd)) return Number.POSITIVE_INFINITY
  return (inUsd * 0.75 + outUsd * 0.25) * 1_000_000
}

function meetsRequirements(model: RoutableModel, req: CapabilityRequirements): boolean {
  if ((req.minContext ?? 0) > model.context_length) return false
  if (req.vision && !(model.architecture?.input_modalities ?? []).includes("image")) {
    return false
  }
  if (req.tools && !(model.supported_parameters ?? []).includes("tools")) {
    return false
  }
  // A model with no positive pricing can't be cost-ranked — treat as
  // ineligible for "cheapest" (also excludes -1 placeholder prices).
  return blendedPricePerMillion(model.pricing) > 0
}

/**
 * Cheapest model satisfying the requirements, or null when nothing
 * qualifies. Ties break alphabetically by id for determinism.
 */
export function pickCheapestModel(
  models: readonly RoutableModel[],
  req: CapabilityRequirements = {},
): RoutableModel | null {
  let best: RoutableModel | null = null
  let bestPrice = Number.POSITIVE_INFINITY
  for (const m of models) {
    if (!meetsRequirements(m, req)) continue
    const price = blendedPricePerMillion(m.pricing)
    if (
      price < bestPrice ||
      (price === bestPrice && best !== null && m.id < best.id)
    ) {
      best = m
      bestPrice = price
    }
  }
  return best
}

/**
 * Resolve the model id to actually send for a turn. A concrete selection
 * passes through untouched; the AUTO entry routes to the cheapest capable
 * model, degrading requirements one at a time (context → vision → tools)
 * so a send never fails just because the ideal model doesn't exist.
 * Returns the selection unchanged when the catalog is empty — the caller
 * will surface its own "no registry" error path.
 */
export function resolveModelId(
  selectedId: string,
  models: readonly RoutableModel[],
  req: CapabilityRequirements = {},
): string {
  if (selectedId !== AUTO_MODEL_ID) return selectedId
  if (models.length === 0) return selectedId

  const relaxed: CapabilityRequirements[] = [
    req,
    { ...req, minContext: undefined },
    { ...req, minContext: undefined, vision: undefined },
    { ...req, minContext: undefined, vision: undefined, tools: undefined },
  ]
  for (const r of relaxed) {
    const picked = pickCheapestModel(models, r)
    if (picked) return picked.id
  }
  // Requirements all relaxed and still nothing ranked (e.g. every entry
  // has non-positive pricing) — fall back to the first catalog entry so
  // the turn still goes out.
  return models[0]?.id ?? selectedId
}
