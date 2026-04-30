import { createOpenRouter } from "@openrouter/ai-sdk-provider"

const masterOpenrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY ?? "",
})

/**
 * Resolve the upstream model client for a given model ID.
 *
 * - If `byokOpenrouterKey` is provided (via `X-BYOK-OpenRouter` header from a
 *   BYOK user), build a per-request OpenRouter client under their key — we
 *   forward, we don't persist.
 * - Otherwise use our master OpenRouter key (hosted tier).
 *
 * Phase 3+: high-volume models can migrate to direct provider SDKs here.
 *   See `honest-ai-scaling.md` for migration triggers.
 */
export function getModel(modelId: string, byokOpenrouterKey?: string) {
  const client = byokOpenrouterKey
    ? createOpenRouter({ apiKey: byokOpenrouterKey })
    : masterOpenrouter
  return client(modelId)
}
