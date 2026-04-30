import { fetch as expoFetch } from "expo/fetch"

import type { ChatMessage, ChatResult, ChatUsage } from "./types"

const OPENROUTER_BASE = "https://openrouter.ai/api/v1"

/**
 * Streams a chat completion from OpenRouter. Uses `expo/fetch` instead of
 * RN's global fetch — Expo Go's native fetch doesn't expose `response.body`
 * as a ReadableStream so SSE parsing wouldn't work.
 *
 * `usage: { include: true }` opts in to OR's usage reporting — the final
 * SSE event arrives with `choices: []` and a populated `usage` object that
 * we capture as the authoritative cost.
 */
export async function streamChatOpenRouter(opts: {
  apiKey: string
  model: string
  messages: ChatMessage[]
  onToken: (chunk: string) => void
  signal?: AbortSignal
}): Promise<ChatResult> {
  const res = await expoFetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
      // Cosmetic: shows "Honest AI" in the user's OR dashboard.
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
                typeof parsed.usage.cost === "number"
                  ? parsed.usage.cost
                  : null,
            }
          }
        } catch {
          // OR occasionally sends `: OPENROUTER PROCESSING` keepalive
          // comments and other non-JSON frames. Skip silently.
        }
      }
    }
  }
  return { content: full, usage, provider: "openrouter" }
}
