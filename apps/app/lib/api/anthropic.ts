import { fetch as expoFetch } from "expo/fetch"

import type { ChatMessage, ChatResult, ChatUsage } from "./types"

const ANTHROPIC_BASE = "https://api.anthropic.com/v1"
const MAX_OUTPUT_TOKENS = 4096

interface AnthropicPricing {
  /** USD per million input tokens (the base rate). */
  inputPerMillion: number
  /** USD per million output tokens. */
  outputPerMillion: number
}

/**
 * Pricing per native Anthropic model id. Phase 1 only ships Haiku 4.5
 * direct, but the map keeps space for Sonnet / Opus 4.7 if we expand
 * `directRoute` to more curated models. Using dated ids since the alias
 * `claude-haiku-4-5` can deprecate independently.
 */
export const ANTHROPIC_PRICING_BY_MODEL: Record<string, AnthropicPricing> = {
  "claude-haiku-4-5-20251001": { inputPerMillion: 1.0, outputPerMillion: 5.0 },
}

/**
 * Cache-tier multipliers vs the base input rate (Anthropic's published
 * pricing model — applies to all models that support prompt caching).
 *  - cache_creation_input_tokens: tokens written into the cache this turn
 *  - cache_read_input_tokens:     tokens served from cache this turn
 */
const CACHE_WRITE_MULT = 1.25
const CACHE_READ_MULT = 0.1

/**
 * Streams a chat completion directly from Anthropic's `/v1/messages` API.
 *
 * Differences vs the OpenRouter streamer:
 *   1. System rows can't live in `messages[]` — Anthropic takes them as a
 *      separate `system` parameter. Caller is expected to pass them inline
 *      with role:"system"; we hoist them out + concatenate.
 *   2. We mark a `cache_control: ephemeral` breakpoint at the end of the
 *      system message so subsequent turns with the same prefix get charged
 *      at the cache_read rate (~10% of normal). Pays off heavily once the
 *      compaction summary makes the prefix stable across many turns.
 *   3. Anthropic's SSE has typed events (`message_start`, `content_block_delta`,
 *      `message_delta`, `message_stop`) instead of OR's OpenAI-shape
 *      `chat.completion.chunk`s.
 *   4. No authoritative `cost` field — we compute from token counts × the
 *      hardcoded native pricing. Cache-write tokens cost 1.25× input,
 *      cache-read tokens cost 0.10× input.
 */
export async function streamChatAnthropic(opts: {
  apiKey: string
  nativeModelId: string
  messages: ChatMessage[]
  pricing: AnthropicPricing
  onToken: (chunk: string) => void
  signal?: AbortSignal
}): Promise<ChatResult> {
  const systemRows = opts.messages.filter((m) => m.role === "system")
  const conversationRows = opts.messages.filter((m) => m.role !== "system")
  const systemText = systemRows
    .map((m) => m.content)
    .join("\n\n")
    .trim()

  const body: {
    model: string
    max_tokens: number
    stream: true
    system?: Array<{
      type: "text"
      text: string
      cache_control?: { type: "ephemeral" }
    }>
    messages: ChatMessage[]
  } = {
    model: opts.nativeModelId,
    max_tokens: MAX_OUTPUT_TOKENS,
    stream: true,
    messages: conversationRows,
  }
  if (systemText) {
    body.system = [
      {
        type: "text",
        text: systemText,
        cache_control: { type: "ephemeral" },
      },
    ]
  }

  const res = await expoFetch(`${ANTHROPIC_BASE}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": opts.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`)
  }
  if (!res.body) throw new Error("No response body to stream")

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let full = ""

  let inputTokens = 0
  let cacheCreationTokens = 0
  let cacheReadTokens = 0
  let outputTokens = 0

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let sep: number
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const event = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)

      for (const line of event.split("\n")) {
        if (!line.startsWith("data:")) continue
        const data = line.slice(5).trim()
        if (!data) continue
        try {
          const parsed = JSON.parse(data) as {
            type?: string
            message?: {
              usage?: {
                input_tokens?: number
                cache_creation_input_tokens?: number
                cache_read_input_tokens?: number
              }
            }
            delta?: { type?: string; text?: string }
            usage?: { output_tokens?: number }
          }
          if (parsed.type === "message_start" && parsed.message?.usage) {
            const u = parsed.message.usage
            inputTokens = u.input_tokens ?? 0
            cacheCreationTokens = u.cache_creation_input_tokens ?? 0
            cacheReadTokens = u.cache_read_input_tokens ?? 0
          } else if (
            parsed.type === "content_block_delta" &&
            parsed.delta?.type === "text_delta"
          ) {
            const text = parsed.delta.text ?? ""
            if (text) {
              full += text
              opts.onToken(text)
            }
          } else if (
            parsed.type === "message_delta" &&
            parsed.usage?.output_tokens != null
          ) {
            outputTokens = parsed.usage.output_tokens
          }
        } catch {
          // Anthropic occasionally sends `event: ping` / non-JSON event
          // lines we don't care about. Skip silently.
        }
      }
    }
  }

  const inRate = opts.pricing.inputPerMillion / 1_000_000
  const outRate = opts.pricing.outputPerMillion / 1_000_000
  const costUsd =
    inputTokens * inRate +
    cacheCreationTokens * inRate * CACHE_WRITE_MULT +
    cacheReadTokens * inRate * CACHE_READ_MULT +
    outputTokens * outRate

  const totalPromptTokens = inputTokens + cacheCreationTokens + cacheReadTokens
  const usage: ChatUsage = {
    promptTokens: totalPromptTokens,
    completionTokens: outputTokens,
    totalTokens: totalPromptTokens + outputTokens,
    costUsd,
  }

  // Anthropic-direct doesn't use OR's web_search server tool. The
  // dispatcher routes to OR when the user wants web search, so this
  // is always empty here.
  return { content: full, usage, provider: "anthropic", citations: [] }
}
