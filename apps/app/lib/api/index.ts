import { pickRoute } from "../byok"
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
 * Public chat dispatcher. Phase 1: OpenRouter only.
 *
 * All requests flow through the user's BYOK OpenRouter key. Direct provider
 * routes (Anthropic, OpenAI, Google) are disabled until their native streamers
 * are wired up, keeping the SSE parsing surface minimal.
 */
export async function streamChat(opts: {
  model: string
  messages: ChatMessage[]
  onToken: (chunk: string) => void
  signal?: AbortSignal
  /** Enable OR's web_search server tool. */
  webSearch?: boolean
  /** Live progress callback for the tool activity panel. Fires on
   *  every change to a tool call's lifecycle. */
  onToolEvent?: (event: ToolCallEvent) => void
}): Promise<ChatResult> {
  // Detect file attachments by walking the content blocks. Used to force
  // the OpenRouter route (Anthropic-direct doesn't run OR plugins).
  const hasFileAttachments = opts.messages.some(
    (m) =>
      Array.isArray(m.content) &&
      m.content.some((b) => b.type === "file"),
  )

  const route = await pickRoute(opts.model, {
    webSearch: opts.webSearch,
    hasFiles: hasFileAttachments,
  })
  if (!route) {
    throw new Error("No API key configured.")
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
    onToolEvent: opts.onToolEvent,
  })
}
