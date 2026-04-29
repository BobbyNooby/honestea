import { createOpenRouter } from "@openrouter/ai-sdk-provider"

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY ?? "",
})

/**
 * Single source of truth for "which upstream serves which model."
 *
 * Phase 2: everything routes through OpenRouter.
 * Phase 3+: high-volume models migrate to direct provider SDKs here without
 *   touching any chat-route code. See `honest-ai-scaling.md` for triggers.
 */
export function getModel(modelId: string) {
  return openrouter(modelId)
}
