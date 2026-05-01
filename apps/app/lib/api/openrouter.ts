import { fetch as expoFetch } from "expo/fetch"

import type { Citation } from "@honestea/shared"

import type { ChatMessage, ChatResult, ChatUsage } from "./types"

const OPENROUTER_BASE = "https://openrouter.ai/api/v1"

/**
 * Streams a chat completion from OpenRouter. Uses `expo/fetch` instead of
 * RN's global fetch — Expo Go's native fetch doesn't expose `response.body`
 * as a ReadableStream so SSE parsing wouldn't work.
 *
 * `usage: { include: true }` opts in to OR's usage reporting — the final
 * SSE event arrives with `choices: []` and a populated `usage` object that
 * we capture as the authoritative cost. When `webSearch` is true, the
 * `openrouter:web_search` server tool is added — the model decides 0–N
 * searches per turn and OR rolls the cost into `usage.cost`. Citations
 * arrive as `delta.annotations[].url_citation` events during streaming.
 */
export async function streamChatOpenRouter(opts: {
  apiKey: string
  model: string
  messages: ChatMessage[]
  onToken: (chunk: string) => void
  signal?: AbortSignal
  /** Enable OR's `openrouter:web_search` server tool for this turn. */
  webSearch?: boolean
  /** True when any user message in `messages` carries a `type: "file"`
   *  content block — triggers OR's `file-parser` plugin so the PDF text
   *  is extracted before the model sees the request. */
  hasFileAttachments?: boolean
}): Promise<ChatResult> {
  const body: Record<string, unknown> = {
    model: opts.model,
    messages: opts.messages,
    stream: true,
    usage: { include: true },
  }
  if (opts.webSearch) {
    // Server-tool form (current). The deprecated `:online` slug suffix and
    // `plugins: [{ id: "web" }]` both still work but force one search per
    // turn; the tool form lets the model search 0-N times based on the
    // question. Default Exa engine — $0.02/turn (5 results × $4/1000).
    body.tools = [{ type: "openrouter:web_search" }]
  }
  if (opts.hasFileAttachments) {
    // OR's file-parser plugin extracts text from PDF blocks before the
    // request reaches the model. cloudflare-ai engine is free (returns
    // markdown). Models that natively accept PDFs would also work without
    // this plugin via the `native` engine, but routing through cloudflare
    // means even text-only models can read a PDF the user attached.
    body.plugins = [
      { id: "file-parser", pdf: { engine: "cloudflare-ai" } },
    ]
  }

  const res = await expoFetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
      // Cosmetic: shows "Honest AI" in the user's OR dashboard.
      "X-Title": "Honest AI",
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
  let usage: ChatUsage | null = null
  // Annotation entries arrive in deltas; dedupe by URL because OR
  // sometimes re-broadcasts the same citation in successive chunks.
  const citationMap = new Map<string, Citation>()

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
            choices?: Array<{
              delta?: {
                content?: string
                annotations?: Array<{
                  type?: string
                  url_citation?: {
                    url?: string
                    title?: string
                    content?: string
                    start_index?: number
                    end_index?: number
                  }
                }>
              }
            }>
            usage?: {
              prompt_tokens?: number
              completion_tokens?: number
              total_tokens?: number
              cost?: number
            }
          }
          const choice = parsed.choices?.[0]
          const delta = choice?.delta?.content
          if (delta) {
            full += delta
            opts.onToken(delta)
          }
          const annotations = choice?.delta?.annotations
          if (annotations && Array.isArray(annotations)) {
            for (const ann of annotations) {
              const c = ann.url_citation
              if (!c?.url) continue
              if (!citationMap.has(c.url)) {
                citationMap.set(c.url, {
                  url: c.url,
                  title: c.title,
                  content: c.content,
                  startIndex: c.start_index,
                  endIndex: c.end_index,
                })
              }
            }
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
  return {
    content: full,
    usage,
    provider: "openrouter",
    citations: [...citationMap.values()],
  }
}
