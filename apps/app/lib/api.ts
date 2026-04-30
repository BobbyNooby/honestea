import { fetch as expoFetch } from "expo/fetch"

import { getOpenRouterKey } from "./byok"

const OPENROUTER_BASE = "https://openrouter.ai/api/v1"

export type ChatRole = "user" | "assistant" | "system"

export interface ChatMessage {
  role: ChatRole
  content: string
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
 */
export async function streamChat(opts: {
  model: string
  messages: ChatMessage[]
  onToken: (chunk: string) => void
  signal?: AbortSignal
}): Promise<string> {
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
          }
          const delta = parsed.choices?.[0]?.delta?.content
          if (delta) {
            full += delta
            opts.onToken(delta)
          }
        } catch {
          // OpenRouter occasionally sends `: OPENROUTER PROCESSING` keepalive
          // comments and other non-JSON frames. Skip silently.
        }
      }
    }
  }
  return full
}
