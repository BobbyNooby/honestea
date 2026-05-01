import type { ChatProvider, Citation } from "@honestea/shared"

export type ChatRole = "user" | "assistant" | "system"

/**
 * A single content block on a chat message. Mirrors OpenAI / OR's content-
 * array shape. We only build this representation at request time — the
 * DB stores plain text + a separate `attachments` column, and the
 * dispatcher merges them into blocks before sending.
 */
export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | {
      type: "file"
      file: {
        filename: string
        /** `data:application/pdf;base64,...` data URI. */
        file_data: string
      }
    }

export interface ChatMessage {
  role: ChatRole
  /**
   * Plain text for the common case, or an array of content blocks when
   * the turn carries an image / file attachment. The dispatcher passes
   * either through to OR; the Anthropic streamer translates blocks
   * into Anthropic's content-array shape.
   */
  content: string | ContentBlock[]
}

/**
 * Real usage data captured from a streaming response.
 *
 * `costUsd` is non-null when the route returns an authoritative cost field
 * (OpenRouter does — `usage.cost`, what the user's key was actually
 * charged). Anthropic's native API doesn't return cost; the streamer
 * computes it from token counts × the model's listed pricing, which gives
 * the same number short of rounding.
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
  /** Real token counts + cost. Null when the route didn't surface them. */
  usage: ChatUsage | null
  /** Backend the request was actually sent to (for the per-message badge). */
  provider: ChatProvider
  /**
   * Web-search sources the model cited. Captured from OR's
   * `annotations[].url_citation` deltas. Empty array when no search ran
   * (web search disabled, or model chose not to search). Anthropic-direct
   * route doesn't run OR's web search — this is always empty there.
   */
  citations: Citation[]
}

/**
 * One server-tool invocation surfaced during streaming. The activity
 * panel rendering on the assistant bubble reads from these.
 *
 * `index` is OpenAI's call-position index (the only field reliably
 * present across delta chunks). `name` is the function name —
 * "web_search" / "web_fetch" / "datetime" — which surfaces once the
 * first chunk for this index arrives. `args` is the (possibly
 * partial) JSON-encoded arguments string built up across deltas.
 *
 * `phase`:
 *  - "streaming": args are still arriving
 *  - "running":   `finish_reason: "tool_calls"` has fired; server is
 *                 executing the tool; no further progress events
 *  - "done":      the model has resumed `delta.content` (answering)
 */
export interface ToolCallEvent {
  index: number
  id?: string
  name: string
  args: string
  phase: "streaming" | "running" | "done"
}
