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
export interface CuratedModel {
  /** OpenRouter slug — sent verbatim to /api/v1/chat/completions. */
  id: string
  displayName: string
  shortName: string
  description: string
}

export const CURATED_MODELS: readonly CuratedModel[] = [
  {
    id: "anthropic/claude-haiku-4.5",
    displayName: "Claude Haiku 4.5",
    shortName: "Haiku 4.5",
    description: "Anthropic — small, fast, cheap.",
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
