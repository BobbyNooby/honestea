export type Role = "user" | "assistant" | "system"

export interface Message {
  id: string
  role: Role
  content: string
  model?: ModelId
  promptTokens?: number
  completionTokens?: number
  costCents?: number
  createdAt: string
}

export interface Conversation {
  id: string
  userId: string | null
  title: string
  createdAt: string
  updatedAt: string
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
