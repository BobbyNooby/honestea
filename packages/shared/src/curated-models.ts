/**
 * Short-list of models surfaced in the chat header picker (and eventually
 * the web app's model badge / account dashboard).
 *
 * Phase 1: hardcoded. Each `id` is a valid OpenRouter slug and is sent
 * verbatim in the chat completions request. Replaced by a registry-driven
 * "favorites on top of full catalog" picker once Epic 2 ships the detailed
 * model browse page.
 *
 * NOTE: Distinct from `MODELS` in `./models.ts`. That registry uses
 * internal IDs (`claude-haiku-4-5`) for cost-calc fallback and tier
 * routing. This curated list is keyed by OpenRouter slug because Phase 1
 * routes BYOK requests directly to OpenRouter. The two will reconcile
 * when the detailed model browse page lands.
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

export interface CuratedModel {
  /** OpenRouter slug — sent verbatim to /api/v1/chat/completions. */
  id: string
  displayName: string
  shortName: string
  description: string
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
    id: "anthropic/claude-haiku-4.5",
    displayName: "Claude Haiku 4.5",
    shortName: "Haiku 4.5",
    description: "Anthropic — small, fast, cheap.",
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
    id: "openai/gpt-5-nano",
    displayName: "GPT-5 Nano",
    shortName: "GPT-5 Nano",
    description: "OpenAI — cheapest tier.",
  },
  {
    id: "moonshotai/kimi-k2.5",
    displayName: "Kimi K2.5",
    shortName: "Kimi K2.5",
    description: "Moonshot — strong long-context for the price.",
  },
  {
    id: "minimax/minimax-m2.5",
    displayName: "MiniMax M2.5",
    shortName: "MiniMax M2.5",
    description: "MiniMax — multimodal, low cost.",
  },
] as const

export const DEFAULT_CURATED_MODEL_ID: string = "anthropic/claude-haiku-4.5"

export function findCuratedModel(id: string): CuratedModel | undefined {
  return CURATED_MODELS.find((m) => m.id === id)
}
