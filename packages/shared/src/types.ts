export type Role = "user" | "assistant" | "system"

/**
 * Lifecycle of a single message row.
 * - `pending`  — created, request not yet sent
 * - `streaming` — request in flight, content being appended
 * - `complete` — fully received
 * - `error`    — request failed; content may be partial
 *
 * On app launch we sweep any `streaming` rows to `error` so a crash
 * mid-stream doesn't leave the UI in a permanent "..." state.
 */
export type MessageStatus = "pending" | "streaming" | "complete" | "error"

/**
 * "normal" = regular user/assistant/system turn the user typed or the
 * model produced. "summary" = synthetic system-role row containing a
 * Haiku-generated summary of older turns. Summary rows are hidden in the
 * chat list and rendered as a divider; they're sent to the model as a
 * system message.
 */
export type MessageKind = "normal" | "summary"

export interface Message {
  id: string
  conversationId: string
  role: Role
  content: string
  /** OpenRouter slug for assistant messages (e.g. "anthropic/claude-haiku-4.5"). */
  modelId: string | null
  promptTokens: number | null
  completionTokens: number | null
  /**
   * Real USD cost as a float — what OR's `usage.cost` returned. Use this
   * for any new code path. Sub-cent precision matters for cheap models.
   */
  costUsd: number | null
  /** @deprecated populated only on pre-v3 rows; new writes leave this null. */
  costCents: number | null
  status: MessageStatus
  /**
   * ms epoch when this message was superseded by a regenerate. Non-null
   * means: hide in the chat view, exclude from the model send-path, but
   * STILL count its cost toward the conversation total (so trailing cost
   * rolls forward across regenerations).
   */
  supersededAt: number | null
  /**
   * ms epoch when this row was rolled into a compaction summary. Same
   * hide-in-UI / skip-from-send / keep-in-cost-sum semantics as
   * `supersededAt` — a row could in principle carry both.
   */
  summarizedAt: number | null
  /**
   * FK → messages.id of the synthetic summary row that replaces this one
   * in the model send-path. Null when not summarized.
   */
  summarizedInto: string | null
  kind: MessageKind
  /** ms epoch */
  createdAt: number
}

export interface Conversation {
  id: string
  /** null = local-only (Phase 1). Non-null = synced to server under this user. */
  userId: string | null
  title: string | null
  /** OpenRouter slug of the most recently used model (picker default on resume). */
  modelId: string
  archived: boolean
  /** User-pinned via the triple-dot menu. Surfaces above non-starred chats in the sidebar. */
  starred: boolean
  /** ms epoch when this conversation was last pushed to the server. null = never. */
  syncedAt: number | null
  /** ms epoch */
  createdAt: number
  /** ms epoch */
  updatedAt: number
}

export interface User {
  id: string
  email: string
  name: string | null
  role: "user" | "admin"
  creditsCents: number
  tier: Tier
  createdAt: string
}

export type Tier = "free_local" | "cloud_byok" | "credits" | "subscription"

export interface ChatRequest {
  conversationId?: string
  messages: Pick<Message, "role" | "content">[]
  model: ModelId
  maxTokens?: number
  stream?: boolean
}

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
}

export type ModelId =
  | "claude-opus-4-7"
  | "claude-sonnet-4-6"
  | "claude-haiku-4-5"
  | "gpt-5"
  | "gpt-4.1"
  | "gpt-nano"
  | "gemini-3.1-pro"
  | "gemini-flash"
  | "kimi-k2.6"
  | "deepseek-v3.2"
  | "mistral-large"
