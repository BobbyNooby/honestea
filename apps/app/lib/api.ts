import { fetch as expoFetch } from "expo/fetch"

import { getOpenRouterKey } from "./byok"

const OPENROUTER_BASE = "https://openrouter.ai/api/v1"

export type ChatRole = "user" | "assistant" | "system"

export interface ChatMessage {
  role: ChatRole
  content: string
}

/**
 * Real usage data parsed from OpenRouter's final SSE chunk. `cost` is in USD
 * and is what the user's key was actually charged (already includes
 * OpenRouter's markup — authoritative). Falsy when OR didn't return usage,
 * which can happen for some niche providers.
 */
export interface ChatUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  costUsd: number | null
}

export interface ChatResult {
  /** Full assembled assistant message text. */
  content: string
  /** Real token counts + cost from OR. Null when the API didn't include them. */
  usage: ChatUsage | null
}

/**
 * Streams a chat completion directly from OpenRouter using the user's BYOK
 * key. Phase 1 is BYOK-only — see CLAUDE.md §"Phase 1 scope".
 *
 * Uses `expo/fetch` instead of RN's global fetch — Expo Go's native fetch
 * doesn't expose `response.body` as a ReadableStream, so SSE parsing
 * wouldn't work.
 *
 * The chat screen gates input on `getOpenRouterKey()` being non-null, so
 * the missing-key throw is defense-in-depth, not a user-facing path.
 *
 * `usage: { include: true }` opts in to OR's usage reporting — the final
 * SSE event arrives with `choices: []` and a populated `usage` object that
 * we capture and return alongside the content.
 */
export async function streamChat(opts: {
  model: string
  messages: ChatMessage[]
  onToken: (chunk: string) => void
  signal?: AbortSignal
}): Promise<ChatResult> {
  const byokKey = await getOpenRouterKey()
  if (!byokKey) throw new Error("No OpenRouter key configured")

  const res = await expoFetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${byokKey}`,
      // Cosmetic: shows "Honest AI" as the calling app in the user's
      // OpenRouter dashboard alongside their spend.
      "X-Title": "Honest AI",
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      stream: true,
      usage: { include: true },
    }),
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
  let usage: ChatUsage | null = null

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // SSE events are delimited by a blank line (\n\n). Drain every complete
    // event from the buffer; leave any partial trailing event for the next
    // chunk.
    let sep: number
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const event = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)

      for (const line of event.split("\n")) {
        if (!line.startsWith("data:")) continue
        const data = line.slice(5).trim()
        if (!data || data === "[DONE]") continue
        try {
          const parsed = JSON.parse(data) as {
            choices?: Array<{ delta?: { content?: string } }>
            usage?: {
              prompt_tokens?: number
              completion_tokens?: number
              total_tokens?: number
              cost?: number
            }
          }
          const delta = parsed.choices?.[0]?.delta?.content
          if (delta) {
            full += delta
            opts.onToken(delta)
          }
          if (parsed.usage) {
            usage = {
              promptTokens: parsed.usage.prompt_tokens ?? 0,
              completionTokens: parsed.usage.completion_tokens ?? 0,
              totalTokens: parsed.usage.total_tokens ?? 0,
              costUsd:
                typeof parsed.usage.cost === "number" ? parsed.usage.cost : null,
            }
          }
        } catch {
          // OpenRouter occasionally sends `: OPENROUTER PROCESSING` keepalive
          // comments and other non-JSON frames. Skip silently.
        }
      }
    }
  }
  return { content: full, usage }
}
