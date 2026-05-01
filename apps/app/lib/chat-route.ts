import { findCuratedModel } from "@honestea/shared"
import * as SecureStore from "expo-secure-store"

import { getOpenRouterKey } from "./byok"

/**
 * Resolved transport for a chat request. The dispatcher in
 * `apps/app/lib/api/index.ts` picks one of these and the matching streamer
 * runs it. `kind` flows through to the assistant message's `provider`
 * column so the UI can render an honest "via X" badge later.
 */
export type ChatRoute =
  | { kind: "openrouter"; key: string }
  | { kind: "anthropic"; key: string; nativeModelId: string }

/**
 * Decide where to send a chat request given the user's stored BYOK keys
 * and the model's curated metadata.
 *
 * Preference order:
 *   1. Native direct (currently Anthropic only) — when the model declares
 *      a `directRoute` AND the matching BYOK key is on file. Skips OR's
 *      markup + unlocks prompt caching. Skipped when `webSearch` is
 *      requested — Anthropic-direct doesn't run OR's `openrouter:web_search`
 *      server tool, and we'd rather lose prompt caching than silently drop
 *      the search.
 *   2. OpenRouter — fallback for everything else, requires OR key.
 *   3. Null — caller is gated upstream (chat input is disabled when no
 *      key exists), so this is just defensive.
 */
export async function pickRoute(
  modelId: string,
  opts?: { webSearch?: boolean },
): Promise<ChatRoute | null> {
  const curated = findCuratedModel(modelId)
  const direct = curated?.directRoute

  if (direct?.provider === "anthropic" && !opts?.webSearch) {
    const key = await SecureStore.getItemAsync("byok_anthropic")
    if (key) {
      return {
        kind: "anthropic",
        key,
        nativeModelId: direct.nativeModelId,
      }
    }
  }

  const orKey = await getOpenRouterKey()
  if (orKey) return { kind: "openrouter", key: orKey }

  return null
}
