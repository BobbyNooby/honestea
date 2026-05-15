/**
 * Short-list of models surfaced in the chat header picker (and eventually
 * the web app's model badge / account dashboard).
 *
 * Phase 1: hardcoded 6-row list across three tiers — flagship, workhorse,
 * basic — each with two members. Each `id` is a valid OpenRouter slug and
 * is sent verbatim in the chat completions request. The full registry-
 * driven `/models` browse page covers everything beyond this short-list.
 *
 * NOTE: keep curated `id`s aligned with current OR slugs — the
 * `scripts/verify-curated.ts` checker pings OR's `/api/v1/models`
 * endpoint and asserts every entry resolves with non-zero pricing /
 * context. Run before each release.
 */
/**
 * Optional native-provider override for a curated model. When the user has
 * a matching direct BYOK key, the chat dispatcher prefers the native API
 * over OpenRouter. Today only Anthropic is wired up — that's where prompt
 * caching unlocks meaningful cost wins. OpenAI/Google direct keys still
 * route through OR (the markup on OR-routed traffic is small and avoiding
 * three native streamers in Phase 1 is worth it).
 */
export interface CuratedModelDirectRoute {
  provider: "anthropic"
  /**
   * The native model id sent to the provider's API. Use a *dated* id (e.g.
   * "claude-haiku-4-5-20251001") rather than the alias — Anthropic
   * deprecates aliases without notice; dated ids stay stable.
   */
  nativeModelId: string
}

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
  /**
   * Optional native-API override. When set AND the user has the matching
   * BYOK key configured, requests go direct (skipping OR's markup +
   * unlocking native features like prompt caching). Otherwise the model
   * falls back to OpenRouter.
   */
  directRoute?: CuratedModelDirectRoute
}

export const CURATED_MODELS: readonly CuratedModel[] = [
  {
    id: "anthropic/claude-opus-4.7",
    displayName: "Claude Opus 4.7",
    shortName: "Opus 4.7",
    description:
      "Code review, instruction-heavy work, low-hallucination critical paths.",
    tier: "flagship",
    // No directRoute yet — we don't have the dated native id pinned and
    // there's no entry in ANTHROPIC_PRICING_BY_MODEL. Routes through OR
    // until both are added.
  },
  {
    id: "openai/gpt-5.5",
    displayName: "GPT-5.5",
    shortName: "GPT-5.5",
    description:
      "Agentic, terminal/computer-use, hard math and reasoning.",
    tier: "flagship",
  },
  {
    id: "minimax/minimax-m2.7",
    displayName: "MiniMax M2.7",
    shortName: "MiniMax M2.7",
    description: "Code generation, agents, refactoring at scale.",
    tier: "workhorse",
    speciality: "coding",
  },
  {
    id: "moonshotai/kimi-k2.6",
    displayName: "Kimi K2.6",
    shortName: "Kimi K2.6",
    description: "Document analysis, research synthesis, general reasoning.",
    tier: "workhorse",
    speciality: "reasoning",
  },
  {
    id: "anthropic/claude-haiku-4.5",
    displayName: "Claude Haiku 4.5",
    shortName: "Haiku 4.5",
    description:
      "User-facing output, structured extraction, anywhere accuracy matters.",
    tier: "basic",
    speciality: "reliable",
    directRoute: {
      provider: "anthropic",
      // Pinned dated id. Anthropic deprecates aliases (e.g. "claude-haiku-4-5"
      // can stop resolving on its own timeline); dated ids don't move.
      // Verify with the anthropic-models check in scripts/verify-curated.ts
      // before each release.
      nativeModelId: "claude-haiku-4-5-20251001",
    },
  },
  {
    id: "openai/gpt-5.4-nano",
    displayName: "GPT-5.4 Nano",
    shortName: "GPT-5.4 Nano",
    description:
      "High-volume classification, query reformulation, sub-agent tasks.",
    tier: "basic",
    speciality: "cheap",
  },
] as const

export const DEFAULT_CURATED_MODEL_ID: string = "anthropic/claude-haiku-4.5"

/**
 * Trending / popular model slugs for the app-store-style Model Browser.
 * Curated from market-popular providers + high-value cheap open-weights.
 * These slugs are looked up in the live OR registry at runtime; any slug
 * that doesn't resolve is silently skipped so the grid never shows duds.
 *
 * Grouped conceptually (not enforced in code) as:
 *   Flagship · Workhorse · Basic · Open Weight
 */
export const TRENDING_MODELS: readonly string[] = [
  // Flagship
  "anthropic/claude-opus-4.7",
  "openai/gpt-5.5",
  "google/gemini-2.5-pro-preview",
  // Workhorse
  "moonshotai/kimi-k2.6",
  "minimax/minimax-m2.7",
  "deepseek/deepseek-v3.2",
  "openai/gpt-4.1",
  // Basic
  "anthropic/claude-haiku-4.5",
  "openai/gpt-5.4-nano",
  "google/gemini-2.5-flash-preview",
  // Open-weight / cheap Chinese
  "deepseek/deepseek-r1",
  "meta-llama/llama-4-maverick",
  "alibaba/qwen3-235b-a22b",
  "x-ai/grok-3",
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
