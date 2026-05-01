import { pickRoute } from "../chat-route"
import {
  ANTHROPIC_PRICING_BY_MODEL,
  streamChatAnthropic,
} from "./anthropic"
import { streamChatOpenRouter } from "./openrouter"
import type { ChatMessage, ChatResult, ToolCallEvent } from "./types"

export type {
  ChatMessage,
  ChatResult,
  ChatUsage,
  ChatRole,
  ToolCallEvent,
} from "./types"

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
  /** Live progress callback for the tool activity panel. Fires on
   *  every change to a tool call's lifecycle. */
  onToolEvent?: (event: ToolCallEvent) => void
}): Promise<ChatResult> {
  // Detect file attachments by walking the content blocks. Used for two
  // things: routing (force OR), and triggering OR's file-parser plugin.
  const hasFileAttachments = opts.messages.some(
    (m) =>
      Array.isArray(m.content) &&
      m.content.some((b) => b.type === "file"),
  )
  // Forced OR routing whenever ANY server tool is in play. Anthropic-direct
  // doesn't run OR's `openrouter:*` tools, and we'd rather lose prompt
  // caching than silently skip the user's tool requests.
  const route = await pickRoute(opts.model, {
    webSearch: opts.webSearch,
    hasFiles: hasFileAttachments,
  })
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

  // When web search is on, also auto-enable web_fetch (free) and
  // datetime (free) so the model has the full toolkit. Both are
  // server-side, agentic — the model decides when to call. Adding them
  // costs nothing extra unless the model actually invokes them.
  const datetimeTimezone = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch {
      return "UTC"
    }
  })()

  return streamChatOpenRouter({
    apiKey: route.key,
    model: opts.model,
    messages: opts.messages,
    onToken: opts.onToken,
    signal: opts.signal,
    webSearch: opts.webSearch,
    webFetch: opts.webSearch,
    datetime: opts.webSearch,
    timezone: datetimeTimezone,
    hasFileAttachments,
    onToolEvent: opts.onToolEvent,
  })
}
