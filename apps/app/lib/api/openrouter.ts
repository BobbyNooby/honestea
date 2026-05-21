import type { Citation } from "@honestea/shared"

import { client } from "../client"
import type {
  ChatMessage,
  ChatResult,
  ChatUsage,
  ToolCallEvent,
} from "./types"

/**
 * Streams a chat completion from OpenRouter. Uses the shared client (which
 * injects expo/fetch) to obtain the streaming Response, then parses SSE
 * events directly from the ReadableStream.
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
  /** Enable OR's `openrouter:web_fetch` (free via openrouter engine).
   *  Lets the model open specific URLs from web_search results or
   *  user-provided links. */
  webFetch?: boolean
  /** Enable OR's `openrouter:datetime` (free). Lets the model query
   *  the current date / time when answering "what's today's date" or
   *  scheduling-style questions. Pass the user's IANA timezone so
   *  results are local to them. */
  datetime?: boolean
  /** IANA timezone for the datetime tool. Falls back to UTC when
   *  unset. */
  timezone?: string

  /** Live progress callback for the tool activity panel. Fires on
   *  every change to a tool call's state — first arrival, args
   *  streamed in, finished, or eclipsed by the answer phase. */
  onToolEvent?: (event: ToolCallEvent) => void
}): Promise<ChatResult> {
  const tools: Array<Record<string, unknown>> = []
  if (opts.webSearch) {
    tools.push({ type: "openrouter:web_search" })
  }
  if (opts.webFetch) {
    tools.push({
      type: "openrouter:web_fetch",
      parameters: { engine: "openrouter" },
    })
  }
  if (opts.datetime) {
    tools.push({
      type: "openrouter:datetime",
      parameters: { timezone: opts.timezone ?? "UTC" },
    })
  }
  const res = await client.openrouter.chat({
    model: opts.model,
    messages: opts.messages,
    stream: true,
    usage: true,
    tools: tools.length > 0 ? tools : undefined,
    extra: { _apiKey: opts.apiKey },
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
  // Tool-call buffer keyed by OpenAI's `index` field. function.name
  // arrives once on first chunk; arguments stream as JSON fragments
  // appended across many chunks. Buffer until finish_reason="tool_calls"
  // freezes the call list, then re-fire as "running".
  const toolCalls = new Map<number, ToolCallEvent>()
  // Has the answering phase started? Set when delta.content first
  // arrives after a tool_calls finish. We bulk-mark all running calls
  // as "done" at that point so the UI panel collapses.
  let answerStarted = false
  const fireToolEvent = (e: ToolCallEvent) => {
    opts.onToolEvent?.(e)
  }

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // Bound a single SSE event. A pathological upstream (one giant
    // `data:` line, missing `\n\n`, or hostile MITM) could otherwise
    // grow `buffer` until OOM. 1 MB per event is far above any
    // legitimate payload — SSE events are typically a few KB.
    if (buffer.length > 1_000_000 && !buffer.includes("\n\n")) {
      throw new Error("Stream framing error: SSE event exceeded 1 MB")
    }

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
                tool_calls?: Array<{
                  index?: number
                  id?: string
                  type?: string
                  function?: { name?: string; arguments?: string }
                }>
              }
              finish_reason?: string
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
            // First content after a tool-calls phase = answer started.
            // Mark any "running" tools as done so the UI can collapse.
            if (!answerStarted && toolCalls.size > 0) {
              answerStarted = true
              for (const tc of toolCalls.values()) {
                if (tc.phase !== "done") {
                  tc.phase = "done"
                  fireToolEvent({ ...tc })
                }
              }
            }
            opts.onToken(delta)
          }
          const toolDeltas = choice?.delta?.tool_calls
          if (toolDeltas && Array.isArray(toolDeltas)) {
            for (const td of toolDeltas) {
              const idx = td.index ?? 0
              const existing =
                toolCalls.get(idx) ?? {
                  index: idx,
                  id: td.id,
                  // Strip OR's `openrouter:` prefix if present so the
                  // UI matches on plain names.
                  name: stripPrefix(td.function?.name ?? ""),
                  args: "",
                  phase: "streaming" as const,
                }
              if (td.id && !existing.id) existing.id = td.id
              if (td.function?.name && !existing.name) {
                existing.name = stripPrefix(td.function.name)
              }
              if (td.function?.arguments) {
                existing.args += td.function.arguments
              }
              toolCalls.set(idx, existing)
              if (existing.name) {
                fireToolEvent({ ...existing })
              }
            }
          }
          if (choice?.finish_reason === "tool_calls") {
            // Server is about to execute the buffered tools. No further
            // SSE progress events arrive during execution — we'll only
            // know they're done once `delta.content` resumes.
            for (const tc of toolCalls.values()) {
              if (tc.phase === "streaming") {
                tc.phase = "running"
                fireToolEvent({ ...tc })
              }
            }
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

/**
 * Server tools surface in `function.name` either prefixed (e.g.
 * `"openrouter:web_search"`) or stripped (e.g. `"web_search"`) depending
 * on OR's translation layer. Normalize to bare name so the UI matches.
 */
function stripPrefix(name: string): string {
  return name.startsWith("openrouter:") ? name.slice("openrouter:".length) : name
}
