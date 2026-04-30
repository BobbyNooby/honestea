import type { ChatProvider } from "@honestea/shared"

export type ChatRole = "user" | "assistant" | "system"

export interface ChatMessage {
  role: ChatRole
  content: string
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
}
