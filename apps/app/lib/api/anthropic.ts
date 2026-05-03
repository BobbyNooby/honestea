import { fetch as expoFetch } from "expo/fetch"

import type {
  ChatMessage,
  ChatResult,
  ChatUsage,
  ContentBlock,
} from "./types"

/**
 * Translate an OpenAI-style content array into Anthropic's content-array
 * shape. Anthropic uses `type: "image"` with a nested `source` object
 * (base64 + media_type, or url) instead of OpenAI's `type: "image_url"`
 * with a flat URL.
 */
function translateContent(
  blocks: ContentBlock[],
): Array<{ type: string; [k: string]: unknown }> {
  return blocks.map((b) => {
    if (b.type === "text") return { type: "text", text: b.text }
    if (b.type === "image_url") {
      const url = b.image_url.url
      if (url.startsWith("data:")) {
        const match = url.match(/^data:([^;]+);base64,(.*)$/)
        if (!match) {
          throw new Error("Malformed data URI on image content block")
        }
        return {
          type: "image",
          source: {
            type: "base64",
            media_type: match[1],
            data: match[2],
          },
        }
      }
      return { type: "image", source: { type: "url", url } }
    }
    // file (PDF) — Anthropic's native shape is `{type: "document",
    // source: {type: "base64", media_type: "application/pdf", data}}`.
    // In practice this branch is unreachable: the chat dispatcher forces
    // the OR route whenever files are attached (Anthropic-direct
    // doesn't run OR's file-parser plugin), but we translate
    // defensively in case routing rules ever change.
    const url = b.file.file_data
    const match = url.match(/^data:([^;]+);base64,(.*)$/)
    if (!match) throw new Error("Malformed data URI on file content block")
    return {
      type: "document",
      source: {
        type: "base64",
        media_type: match[1],
        data: match[2],
      },
    }
  })
}

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
  const conversationRows = opts.messages.filter(
    (m): m is ChatMessage & { role: "user" | "assistant" } =>
      m.role !== "system",
  )
  // System rows in our app are always plain text (style prompt +
  // compaction summary). Defensive flatten in case a block-array ever
  // sneaks in: stringify text blocks, drop image blocks (Anthropic
  // doesn't accept images in `system`).
  const systemText = systemRows
    .map((m) => {
      if (typeof m.content === "string") return m.content
      return m.content
        .filter((b): b is { type: "text"; text: string } => b.type === "text")
        .map((b) => b.text)
        .join("\n\n")
    })
    .join("\n\n")
    .trim()

  // Translate any OpenAI-style image_url blocks into Anthropic's
  // image-source shape so the native API accepts them.
  const translatedConversation = conversationRows.map((m) => ({
    role: m.role,
    content:
      typeof m.content === "string" ? m.content : translateContent(m.content),
  }))

  const body: {
    model: string
    max_tokens: number
    stream: true
    system?: Array<{
      type: "text"
      text: string
      cache_control?: { type: "ephemeral" }
    }>
    messages: typeof translatedConversation
  } = {
    model: opts.nativeModelId,
    max_tokens: MAX_OUTPUT_TOKENS,
    stream: true,
    messages: translatedConversation,
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

    // Bound a single SSE event so a malformed/hostile stream can't grow
    // `buffer` to OOM. 1 MB is far above any legitimate event size.
    if (buffer.length > 1_000_000 && !buffer.includes("\n\n")) {
      throw new Error("Stream framing error: SSE event exceeded 1 MB")
    }

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
