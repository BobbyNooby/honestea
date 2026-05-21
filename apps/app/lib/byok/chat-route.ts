import { getOpenRouterKey } from "./byok"

/**
 * Resolved transport for a chat request. The dispatcher in
 * `apps/app/lib/api/index.ts` picks one of these and the matching streamer
 * runs it. `kind` flows through to the assistant message's `provider`
 * column so the UI can render an honest "via X" badge later.
 */
export type ChatRoute = { kind: "openrouter"; key: string }

/**
 * Decide where to send a chat request given the user's stored BYOK keys.
 *
 * Phase 1: OpenRouter only. Anthropic / OpenAI / Google direct routes are
 * disabled until their native streamers are wired up. One key unlocks
 * every model via OR, which keeps the chat path simple and the SSE
 * parsing surface minimal.
 */
export async function pickRoute(
  _modelId: string,
  _opts?: { webSearch?: boolean; hasFiles?: boolean },
): Promise<ChatRoute | null> {
  const orKey = await getOpenRouterKey()
  if (orKey) return { kind: "openrouter", key: orKey }
  return null
}
