import type { ModelId } from "./types.ts"

export type Provider = "anthropic" | "openai" | "google" | "moonshot" | "deepseek" | "mistral"

export interface ModelSpec {
  id: ModelId
  provider: Provider
  displayName: string
  contextWindow: number
  vision: boolean
  toolCalling: boolean
  inputCostPerMillion: number
  outputCostPerMillion: number
}

export const MODELS: Record<ModelId, ModelSpec> = {
  "claude-opus-4-7": {
    id: "claude-opus-4-7",
    provider: "anthropic",
    displayName: "Claude Opus 4.7",
    contextWindow: 200_000,
    vision: true,
    toolCalling: true,
    inputCostPerMillion: 15.0,
    outputCostPerMillion: 75.0,
  },
  "claude-sonnet-4-6": {
    id: "claude-sonnet-4-6",
    provider: "anthropic",
    displayName: "Claude Sonnet 4.6",
    contextWindow: 200_000,
    vision: true,
    toolCalling: true,
    inputCostPerMillion: 3.0,
    outputCostPerMillion: 15.0,
  },
  "claude-haiku-4-5": {
    id: "claude-haiku-4-5",
    provider: "anthropic",
    displayName: "Claude Haiku 4.5",
    contextWindow: 200_000,
    vision: true,
    toolCalling: true,
    inputCostPerMillion: 1.0,
    outputCostPerMillion: 5.0,
  },
  "gpt-5": {
    id: "gpt-5",
    provider: "openai",
    displayName: "GPT-5",
    contextWindow: 256_000,
    vision: true,
    toolCalling: true,
    inputCostPerMillion: 5.0,
    outputCostPerMillion: 20.0,
  },
  "gpt-4.1": {
    id: "gpt-4.1",
    provider: "openai",
    displayName: "GPT-4.1",
    contextWindow: 128_000,
    vision: true,
    toolCalling: true,
    inputCostPerMillion: 2.5,
    outputCostPerMillion: 10.0,
  },
  "gpt-nano": {
    id: "gpt-nano",
    provider: "openai",
    displayName: "GPT Nano",
    contextWindow: 128_000,
    vision: false,
    toolCalling: true,
    inputCostPerMillion: 0.15,
    outputCostPerMillion: 0.6,
  },
  "gemini-3.1-pro": {
    id: "gemini-3.1-pro",
    provider: "google",
    displayName: "Gemini 3.1 Pro",
    contextWindow: 1_000_000,
    vision: true,
    toolCalling: true,
    inputCostPerMillion: 1.25,
    outputCostPerMillion: 5.0,
  },
  "gemini-flash": {
    id: "gemini-flash",
    provider: "google",
    displayName: "Gemini Flash",
    contextWindow: 1_000_000,
    vision: true,
    toolCalling: true,
    inputCostPerMillion: 0.075,
    outputCostPerMillion: 0.3,
  },
  "kimi-k2.6": {
    id: "kimi-k2.6",
    provider: "moonshot",
    displayName: "Kimi K2.6",
    contextWindow: 128_000,
    vision: true,
    toolCalling: true,
    inputCostPerMillion: 0.6,
    outputCostPerMillion: 2.5,
  },
  "deepseek-v3.2": {
    id: "deepseek-v3.2",
    provider: "deepseek",
    displayName: "DeepSeek V3.2",
    contextWindow: 64_000,
    vision: false,
    toolCalling: true,
    inputCostPerMillion: 0.14,
    outputCostPerMillion: 0.28,
  },
  "mistral-large": {
    id: "mistral-large",
    provider: "mistral",
    displayName: "Mistral Large",
    contextWindow: 128_000,
    vision: false,
    toolCalling: true,
    inputCostPerMillion: 2.0,
    outputCostPerMillion: 6.0,
  },
}

export function getModel(id: ModelId): ModelSpec {
  const spec = MODELS[id]
  if (!spec) throw new Error(`Unknown model: ${id}`)
  return spec
}

export function getProvider(id: ModelId): Provider {
  return getModel(id).provider
}
