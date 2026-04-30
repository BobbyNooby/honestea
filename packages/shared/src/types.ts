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

export interface Message {
  id: string
  conversationId: string
  role: Role
  content: string
  /** OpenRouter slug for assistant messages (e.g. "anthropic/claude-haiku-4.5"). */
  modelId: string | null
  promptTokens: number | null
  completionTokens: number | null
  costCents: number | null
  status: MessageStatus
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
