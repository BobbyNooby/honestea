import type { Message } from "@honestea/shared"
import { AUTO_MODEL_ID, estimateTokens } from "@honestea/shared"
import { ApiError } from "@honestea/shared/client"

import { client } from "../client"
import { getOpenRouterKey } from "../byok"
import {
  addMessage,
  markMessagesSummarizedInto,
  recordUsageEvent,
  updateMessage,
} from "../db/repository"

/**
 * Default model for compaction when the caller doesn't specify one.
 * The caller almost always passes the active chat model so compaction
 * never breaks because a hardcoded slug was deprecated.
 */
const DEFAULT_SUMMARIZE_MODEL = "anthropic/claude-haiku-4.5"

/**
 * Output token cap for the summary. 800 tokens ≈ 600 words ≈ a tight
 * paragraph or two — enough to preserve facts and decisions without
 * bloating the working context.
 */
const SUMMARY_MAX_TOKENS = 800

const SUMMARIZE_PROMPT = [
  "You are summarizing a conversation so the next turn fits in context.",
  "Output a single concise summary covering everything the model needs to continue helpfully:",
  "  - Facts the user shared (names, identifiers, file paths, code, numbers).",
  "  - Decisions and conclusions that have been reached.",
  "  - Persona, tone, or instructions the user gave the assistant.",
  "  - Open questions or pending tasks.",
  "",
  "Do NOT add commentary or your own opinions. Do NOT use markdown headers.",
  "Write in plain prose, third-person about the user and assistant.",
  "Begin directly with the summary content.",
].join("\n")

export interface CompactSuccess {
  ok: true
  summaryId: string
  summarizedCount: number
}

export interface CompactFailure {
  ok: false
  error: string
}

export type CompactResult = CompactSuccess | CompactFailure

/**
 * Summarize all eligible messages in the conversation into a single
 * synthetic system-role row, then mark each one `summarizedAt` +
 * `summarizedInto`. The send-path replaces these messages with the
 * summary; the visual history still renders them (they're not hidden).
 *
 * No minimums or "keep recent" reservations — if the user asked to
 * compact, we compact. More API calls = more revenue, and the user
 * explicitly chose this.
 *
 * Eligible = not superseded (regenerate), not already summarized.
 * Summary rows from a prior compaction are included so re-compaction
 * folds the old summary into the new one (summary + new messages →
 * new summary).
 */
export async function compact(opts: {
  conversationId: string
  /** Full conversation, current state. Caller is responsible for passing fresh data. */
  messages: readonly Message[]
  /** Selected model's `context_length`. Used only for projectPromptTokens. */
  modelContextLength: number
  /** Which model to use for the summarize call. Defaults to the user's current
   *  chat model so compaction never breaks because a hardcoded slug rotted. */
  summarizeModel?: string
  signal?: AbortSignal
}): Promise<CompactResult> {
  const eligible = opts.messages.filter(
    (m) =>
      m.supersededAt === null &&
      m.summarizedAt === null,
  )

  if (eligible.length === 0) {
    return {
      ok: false,
      error: "No messages to compact.",
    }
  }

  const byokKey = await getOpenRouterKey()
  if (!byokKey) {
    return { ok: false, error: "No OpenRouter key configured." }
  }

  // The "auto" sentinel is a picker concept, not a real slug — map it
  // to the cheap default here so every call site is safe.
  const summarizeModel =
    !opts.summarizeModel || opts.summarizeModel === AUTO_MODEL_ID
      ? DEFAULT_SUMMARIZE_MODEL
      : opts.summarizeModel

  // Per-message truncation guards against a single pasted log
  // ballooning the summarizer prompt (and OOM/4xx-ing the request).
  const PER_MESSAGE_LIMIT = 4000
  const transcript = eligible
    .map((m) => {
      const body =
        m.content.length > PER_MESSAGE_LIMIT
          ? `${m.content.slice(0, PER_MESSAGE_LIMIT)}… [truncated]`
          : m.content
      return `${m.role.toUpperCase()}: ${body}`
    })
    .join("\n\n")

  const userPrompt = `${SUMMARIZE_PROMPT}\n\nConversation to summarize:\n\n${transcript}`

  let summaryText = ""
  let usage: { promptTokens: number; completionTokens: number; costUsd: number } | null = null
  try {
    const json = (await client.openrouter.chat({
      model: summarizeModel,
      messages: [{ role: "user", content: userPrompt }],
      max_tokens: SUMMARY_MAX_TOKENS,
      usage: true,
      extra: { _apiKey: byokKey },
      signal: opts.signal,
    })) as {
      choices?: Array<{ message?: { content?: string } }>
      usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number }
    }
    summaryText = (json.choices?.[0]?.message?.content ?? "").trim()
    if (json.usage && typeof json.usage.cost === "number") {
      usage = {
        promptTokens: json.usage.prompt_tokens ?? 0,
        completionTokens: json.usage.completion_tokens ?? 0,
        costUsd: json.usage.cost,
      }
    }
  } catch (e) {
    if (e instanceof ApiError) {
      return { ok: false, error: `Summarize HTTP ${e.status}: ${e.body}` }
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Summarize call failed",
    }
  }

  if (!summaryText) {
    return { ok: false, error: "Summary came back empty." }
  }

  // Insert the summary row FIRST so we have its id for the FK update.
  const summaryRow = await addMessage({
    conversationId: opts.conversationId,
    role: "system",
    content: summaryText,
    modelId: summarizeModel,
    status: "complete",
    kind: "summary",
    promptTokens: usage?.promptTokens ?? null,
    completionTokens: usage?.completionTokens ?? null,
    costUsd: usage?.costUsd ?? null,
    provider: "openrouter",
  })

  // Record the compaction call in the immutable usage ledger — it cost
  // real money and should show up in the usage screen like any other turn.
  if (usage) {
    await recordUsageEvent({
      modelId: summarizeModel,
      provider: "openrouter",
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      costUsd: usage.costUsd,
      messageId: summaryRow.id,
    })
  }

  await markMessagesSummarizedInto(
    eligible.map((m) => m.id),
    summaryRow.id,
  )

  return {
    ok: true,
    summaryId: summaryRow.id,
    summarizedCount: eligible.length,
  }
}

function sumTokens(messages: readonly Message[]): number {
  let total = 0
  for (const m of messages) total += estimateTokens(m.content)
  return total
}

/**
 * Compute the projected prompt-token count for the next send turn given
 * the current message list. Excludes superseded + already-summarized rows;
 * includes summary rows themselves (they're still in the prompt).
 */
export function projectPromptTokens(messages: readonly Message[]): number {
  const sendable = messages.filter(
    (m) => m.supersededAt === null && m.summarizedAt === null,
  )
  return sumTokens(sendable)
}