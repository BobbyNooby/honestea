import { pickRoute } from "../chat-route"
import {
  ANTHROPIC_PRICING_BY_MODEL,
  streamChatAnthropic,
} from "./anthropic"
import { streamChatOpenRouter } from "./openrouter"
import type { ChatMessage, ChatResult } from "./types"

export type { ChatMessage, ChatResult, ChatUsage, ChatRole } from "./types"

/**
 * Public chat dispatcher. Resolves the user's preferred route for the given
 * model (Anthropic-direct when keys + curated config allow, OpenRouter
 * otherwise) and forwards to the matching streamer.
 *
 * Both streamers return `ChatResult` with `provider` set so the caller can
 * stamp the assistant message row with route provenance.
 */
export async function streamChat(opts: {
  model: string
  messages: ChatMessage[]
  onToken: (chunk: string) => void
  signal?: AbortSignal
  /** Enable OR's web_search server tool. Forces the OpenRouter route even
   *  for models that have an Anthropic directRoute. */
  webSearch?: boolean
}): Promise<ChatResult> {
  const route = await pickRoute(opts.model, { webSearch: opts.webSearch })
  if (!route) {
    throw new Error("No API key configured.")
  }

  if (route.kind === "anthropic") {
    const pricing = ANTHROPIC_PRICING_BY_MODEL[route.nativeModelId]
    if (!pricing) {
      throw new Error(
        `No native pricing on file for ${route.nativeModelId}. ` +
          `Add it to ANTHROPIC_PRICING_BY_MODEL in lib/api/anthropic.ts.`,
      )
    }
    return streamChatAnthropic({
      apiKey: route.key,
      nativeModelId: route.nativeModelId,
      messages: opts.messages,
      pricing,
      onToken: opts.onToken,
      signal: opts.signal,
    })
  }

  return streamChatOpenRouter({
    apiKey: route.key,
    model: opts.model,
    messages: opts.messages,
    onToken: opts.onToken,
    signal: opts.signal,
    webSearch: opts.webSearch,
  })
}
