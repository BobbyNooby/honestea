/**
 * Shared API client for HonesTea.
 *
 * Zero runtime dependencies — the caller injects a `fetch` implementation.
 * In the Expo app, pass `fetch` from `expo/fetch` (exposes ReadableStream
 * for SSE). On the server (Bun), pass the global `fetch`.
 *
 * Usage:
 *   import { createClient } from "@honestea/shared/client"
 *   const client = createClient({ fetch: expoFetch })
 *   const models = await client.openrouter.models()
 *   const stream = await client.openrouter.chat({ model: "...", ... })
 */

// ---- Provider base URLs ----

export const OPENROUTER_BASE = "https://openrouter.ai/api/v1"
export const ANTHROPIC_BASE = "https://api.anthropic.com/v1"
export const OPENAI_BASE = "https://api.openai.com/v1"
export const GOOGLE_AI_BASE = "https://generativelanguage.googleapis.com/v1beta"

// ---- Types ----

/** Minimal fetch interface — accepts both global fetch and expo/fetch. */
export type FetchImpl = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

/** Configuration passed to createClient. */
export interface ClientConfig {
  /** Fetch implementation. expo/fetch in the app, global fetch on the server. */
  fetch: FetchImpl
  /** Optional base URL overrides (useful for testing or self-hosted OR). */
  openrouterBase?: string
  anthropicBase?: string
  openaiBase?: string
  googleAiBase?: string
}

/** An OpenRouter or Anthropic API key, already resolved by the caller. */
export interface ApiKeys {
  openrouter?: string
  anthropic?: string
  openai?: string
  google?: string
}

// ---- Error ----

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
    public readonly body: string,
  ) {
    super(`API ${status} from ${url}: ${body.slice(0, 200)}`)
    this.name = "ApiError"
  }
}

// ---- Helpers ----

async function jsonOrError(fetchFn: FetchImpl, url: string, init: RequestInit): Promise<unknown> {
  const res = await fetchFn(url, init)
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new ApiError(res.status, url, text || res.statusText)
  }
  return res.json()
}

function bearerHeader(key: string): Record<string, string> {
  return { Authorization: `Bearer ${key}` }
}

// ---- OpenRouter namespace ----

export interface OpenRouterChatOptions {
  model: string
  messages: unknown[]
  /** Stream the response (SSE). Default false. */
  stream?: boolean
  /** Include usage in the final chunk. Default false. */
  usage?: boolean
  /** OR server tools (web_search, web_fetch, datetime). */
  tools?: Array<Record<string, unknown>>
  /** OR plugins (file-parser, etc). */
  plugins?: Array<Record<string, unknown>>
  /** Max tokens for the completion. */
  max_tokens?: number
  /** Extra body fields merged in. */
  extra?: Record<string, unknown>
  /** AbortSignal for cancellation. */
  signal?: AbortSignal
}

export interface OpenRouterKeyInfo {
  label: string | null
  usage: number | null
  limit: number | null
  isFreeTier: boolean | null
  rateLimit: { requests: number; interval: string } | null
}

/** Alias — historically used as the generic "BYOK key metadata" type. */
export type ByokKeyInfo = OpenRouterKeyInfo

export interface OpenRouterUsageInfo {
  key: OpenRouterKeyInfo
  byokUsage: { requests: number; cost: number } | null
}

class OpenRouterNamespace {
  constructor(
    private readonly fetch: FetchImpl,
    private readonly base: string,
  ) {}

  /** GET /models — public, no auth required. */
  async models(signal?: AbortSignal): Promise<unknown> {
    return jsonOrError(this.fetch, `${this.base}/models`, { signal })
  }

  /** POST /chat/completions — JSON (non-streaming) response. */
  async chat(opts: OpenRouterChatOptions & { stream?: false }): Promise<unknown>
  /** POST /chat/completions — streaming SSE. Returns the raw Response so the
   *  caller can read the body as a ReadableStream. */
  async chat(opts: OpenRouterChatOptions & { stream: true }): Promise<Response>
  async chat(opts: OpenRouterChatOptions): Promise<unknown> {
    const { model, messages, stream, usage, tools, plugins, max_tokens, extra, signal } = opts
    const body: Record<string, unknown> = {
      model,
      messages,
      stream: stream ?? false,
      usage: usage ? { include: true } : undefined,
      max_tokens,
      tools: tools?.length ? tools : undefined,
      plugins: plugins?.length ? plugins : undefined,
      ...extra,
    }
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...bearerHeader(opts.extra?._apiKey as string ?? ""),
      "X-Title": "Honest AI",
    }
    // Remove internal key from the wire body
    delete body._apiKey

    const res = await this.fetch(`${this.base}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new ApiError(res.status, `${this.base}/chat/completions`, text || res.statusText)
    }
    if (stream) return res
    return res.json()
  }

  /** GET /auth/key — validate an OR key and get metadata. */
  async validateKey(key: string, signal?: AbortSignal): Promise<{ valid: boolean; error?: string; info?: OpenRouterKeyInfo }> {
    try {
      const data = (await jsonOrError(this.fetch, `${this.base}/auth/key`, {
        headers: bearerHeader(key),
        signal,
      })) as Record<string, unknown>
      return {
        valid: true,
        info: {
          label: (data.label as string) ?? null,
          usage: data.usage as number ?? null,
          limit: data.limit as number ?? null,
          isFreeTier: data.is_free_tier as boolean ?? null,
          rateLimit: data.rate_limit as OpenRouterKeyInfo["rateLimit"] ?? null,
        },
      }
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        return { valid: false, error: e.body }
      }
      return { valid: false, error: e instanceof Error ? e.message : "Validation failed" }
    }
  }

  /** GET /key — full usage + balance info for the authenticated key. */
  async keyInfo(key: string, signal?: AbortSignal): Promise<unknown> {
    return jsonOrError(this.fetch, `${this.base}/key`, {
      headers: bearerHeader(key),
      signal,
    })
  }
}

// ---- Anthropic namespace ----

export interface AnthropicChatOptions {
  model: string
  messages: unknown[]
  system?: unknown
  max_tokens: number
  stream?: boolean
  extra?: Record<string, unknown> & { _apiKey?: string }
  signal?: AbortSignal
}

class AnthropicNamespace {
  constructor(
    private readonly fetch: FetchImpl,
    private readonly base: string,
  ) {}

  /** POST /messages — returns raw Response for streaming, parsed JSON otherwise. */
  async chat(opts: AnthropicChatOptions & { stream?: false }): Promise<unknown>
  async chat(opts: AnthropicChatOptions & { stream: true }): Promise<Response>
  async chat(opts: AnthropicChatOptions): Promise<unknown> {
    const { model, messages, system, max_tokens, stream, extra, signal } = opts
    const body: Record<string, unknown> = {
      model,
      messages,
      max_tokens,
      stream: stream ?? false,
      ...system ? { system } : {},
      ...extra,
    }
    const apiKey = (extra?._apiKey as string) ?? ""
    delete body._apiKey

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    }
    const res = await this.fetch(`${this.base}/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new ApiError(res.status, `${this.base}/messages`, text || res.statusText)
    }
    if (opts.stream) return res
    return res.json()
  }

  /** GET /models — validate an Anthropic key. */
  async validateKey(key: string, signal?: AbortSignal): Promise<{ valid: boolean; error?: string }> {
    try {
      await jsonOrError(this.fetch, `${this.base}/models`, {
        headers: {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        signal,
      })
      return { valid: true }
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        return { valid: false, error: "Invalid API key" }
      }
      return { valid: false, error: e instanceof Error ? e.message : "Validation failed" }
    }
  }
}

// ---- OpenAI namespace ----

class OpenAINamespace {
  constructor(
    private readonly fetch: FetchImpl,
    private readonly base: string,
  ) {}

  /** GET /models — validate an OpenAI key. */
  async validateKey(key: string, signal?: AbortSignal): Promise<{ valid: boolean; error?: string }> {
    try {
      await jsonOrError(this.fetch, `${this.base}/models`, {
        headers: bearerHeader(key),
        signal,
      })
      return { valid: true }
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        return { valid: false, error: "Invalid API key" }
      }
      return { valid: false, error: e instanceof Error ? e.message : "Validation failed" }
    }
  }
}

// ---- Google AI namespace ----

class GoogleAINamespace {
  constructor(
    private readonly fetch: FetchImpl,
    private readonly base: string,
  ) {}

  /** GET /models — validate a Google AI key. */
  async validateKey(key: string, signal?: AbortSignal): Promise<{ valid: boolean; error?: string }> {
    try {
      await jsonOrError(this.fetch, `${this.base}/models`, {
        headers: { "x-goog-api-key": key },
        signal,
      })
      return { valid: true }
    } catch (e) {
      if (e instanceof ApiError && (e.status === 400 || e.status === 403)) {
        return { valid: false, error: "Invalid API key" }
      }
      return { valid: false, error: e instanceof Error ? e.message : "Validation failed" }
    }
  }
}

// ---- Top-level client ----

export interface HonesTeaClient {
  openrouter: OpenRouterNamespace
  anthropic: AnthropicNamespace
  openai: OpenAINamespace
  google: GoogleAINamespace
  /** The raw fetch implementation passed at creation time. */
  fetch: FetchImpl
}

export function createClient(config: ClientConfig): HonesTeaClient {
  const orBase = config.openrouterBase ?? OPENROUTER_BASE
  return {
    openrouter: new OpenRouterNamespace(config.fetch, orBase),
    anthropic: new AnthropicNamespace(config.fetch, config.anthropicBase ?? ANTHROPIC_BASE),
    openai: new OpenAINamespace(config.fetch, config.openaiBase ?? OPENAI_BASE),
    google: new GoogleAINamespace(config.fetch, config.googleAiBase ?? GOOGLE_AI_BASE),
    fetch: config.fetch,
  }
}