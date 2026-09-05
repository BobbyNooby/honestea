/**
 * Short-list of models surfaced in the chat header picker.
 *
 * Three tiers — flagship, workhorse, basic — curated by hand, validated
 * against the live catalog at runtime (see `availableCuratedModels`):
 * a slug that OpenRouter retires simply stops rendering instead of
 * showing a dead row. Each `id` is a valid OpenRouter slug and is sent
 * verbatim in the chat completions request. The registry-driven /models
 * browse page covers everything beyond this short-list.
 *
 * NOTE: keep curated `id`s aligned with current OR slugs — the
 * `scripts/verify-curated.ts` checker pings OR's `/api/v1/models`
 * endpoint and asserts every entry resolves with non-zero pricing /
 * context. Run before each release.
 */
/**
 * Coarse usage category. Drives the section headers in the picker so the
 * user sees "Flagship / Workhorse / Basic" groupings instead of one flat
 * list.
 */
export type CuratedTier = "flagship" | "workhorse" | "basic"

export interface CuratedModel {
  /** OpenRouter slug — sent verbatim to /api/v1/chat/completions. */
  id: string
  displayName: string
  shortName: string
  /** What this model is good for (renders under the name in the picker). */
  description: string
  tier: CuratedTier
  /**
   * Optional specialization within the tier — surfaced as a small chip on
   * the row. E.g. workhorse · "coding" vs workhorse · "reasoning".
   */
  speciality?: string
}

export const CURATED_MODELS: readonly CuratedModel[] = [
  {
    id: "anthropic/claude-fable-5.1",
    displayName: "Claude Fable 5.1",
    shortName: "Fable 5.1",
    description:
      "Anthropic's frontier. 1M context — best-in-class writing and long-document work.",
    tier: "flagship",
    speciality: "writing",
  },
  {
    id: "openai/gpt-6-astra",
    displayName: "GPT-6 Astra",
    shortName: "GPT-6 Astra",
    description:
      "OpenAI's flagship multimodal model. 1M+ context, top-tier reasoning.",
    tier: "flagship",
    speciality: "multimodal",
  },
  {
    id: "moonshotai/kimi-k3",
    displayName: "Kimi K3",
    shortName: "Kimi K3",
    description:
      "Open-weights flagship. Frontier-class agentic work at a third of the price.",
    tier: "flagship",
    speciality: "open weights",
  },
  {
    id: "z-ai/glm-5.3",
    displayName: "GLM 5.3",
    shortName: "GLM 5.3",
    description:
      "The daily driver. 1.3M context and strong reasoning at a workhorse price.",
    tier: "workhorse",
    speciality: "long context",
  },
  {
    id: "deepseek/deepseek-v4-pro",
    displayName: "DeepSeek V4 Pro",
    shortName: "DS V4 Pro",
    description:
      "Hard problems per dollar — reasoning and code at a fraction of flagship cost.",
    tier: "workhorse",
    speciality: "value",
  },
  {
    id: "deepseek/deepseek-v4-flash",
    displayName: "DeepSeek V4 Flash",
    shortName: "DS V4 Flash",
    description:
      "Near-free replies (~$0.09/M in). Great default for high-volume chat.",
    tier: "basic",
    speciality: "cheapest",
  },
  {
    id: "z-ai/glm-5.3-flash",
    displayName: "GLM 5.3 Flash",
    shortName: "GLM 5.3 Flash",
    description:
      "The speed tier of GLM 5.3 — snappy, sub-cent turns, huge context.",
    tier: "basic",
    speciality: "fast",
  },
] as const

export const DEFAULT_CURATED_MODEL_ID: string = "z-ai/glm-5.3"

/**
 * Trending / popular model slugs for the app-store-style Model Browser.
 * These slugs are looked up in the live OR registry at runtime; any slug
 * that doesn't resolve is silently skipped so the grid never shows duds.
 */
export const TRENDING_MODELS: readonly string[] = [
  // Flagship
  "anthropic/claude-fable-5.1",
  "openai/gpt-6-astra",
  "moonshotai/kimi-k3",
  // Workhorse
  "z-ai/glm-5.3",
  "deepseek/deepseek-v4-pro",
  "z-ai/glm-5.2",
  // Basic / fast
  "deepseek/deepseek-v4-flash",
  "z-ai/glm-5.3-flash",
  "deepseek/deepseek-v3.2",
] as const

export function findCuratedModel(id: string): CuratedModel | undefined {
  return CURATED_MODELS.find((m) => m.id === id)
}

const TIER_ORDER: readonly CuratedTier[] = ["flagship", "workhorse", "basic"]

/**
 * Group the curated list into section-friendly chunks for the picker.
 * Tier order is fixed (flagship → workhorse → basic); within each tier
 * insertion order is preserved so the order in `CURATED_MODELS` is the
 * order the user sees.
 */
export function curatedModelsByTier(): Array<{
  tier: CuratedTier
  models: readonly CuratedModel[]
}> {
  return TIER_ORDER.map((tier) => ({
    tier,
    models: CURATED_MODELS.filter((m) => m.tier === tier),
  })).filter((group) => group.models.length > 0)
}

export function curatedTierLabel(tier: CuratedTier): string {
  switch (tier) {
    case "flagship":
      return "Flagship"
    case "workhorse":
      return "Workhorse"
    case "basic":
      return "Basic"
  }
}

// ── Registry-backed validation ────────────────────────────────────────
// The curated list is hand-maintained; OpenRouter's catalog is not
// static. These helpers reconcile the two at runtime so a renamed or
// retired slug can never render as a dead row.

/**
 * Curated entries that still exist in the provided catalog (an OpenRouter
 * `/models` response), preserving curated order. A catalog entry with
 * zero/absent pricing is treated as unavailable.
 */
export function availableCuratedModels(
  models: ReadonlyArray<{ id: string; pricing?: { prompt?: string | number } }>,
): CuratedModel[] {
  const alive = new Set(
    models
      .filter((m) => {
        const p = m.pricing?.prompt
        const n = typeof p === "string" ? Number.parseFloat(p) : p
        return typeof n === "number" && Number.isFinite(n) && n > 0
      })
      .map((m) => m.id),
  )
  return CURATED_MODELS.filter((m) => alive.has(m.id))
}

/**
 * The model id a fresh install should start on: the pinned default when
 * it's still in the catalog, else the first curated survivor, else the
 * first catalog entry. Empty catalog → the pinned default (send paths
 * already surface their own "no key / no registry" errors).
 */
export function resolveDefaultModelId(
  models: ReadonlyArray<{ id: string }>,
): string {
  if (models.some((m) => m.id === DEFAULT_CURATED_MODEL_ID)) {
    return DEFAULT_CURATED_MODEL_ID
  }
  const curated = availableCuratedModels(
    models as Array<{ id: string; pricing?: { prompt?: string | number } }>,
  )
  return curated[0]?.id ?? models[0]?.id ?? DEFAULT_CURATED_MODEL_ID
}
