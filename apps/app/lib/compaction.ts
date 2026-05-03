import type { Message } from "@honestea/shared"
import { estimateTokens } from "@honestea/shared"

import { getOpenRouterKey } from "./byok"
import {
  addMessage,
  listMessages,
  markMessagesSummarizedInto,
} from "./db/repository"

/**
 * Always summarize via the cheapest curated model regardless of the user's
 * current chat model. Same reasoning as title generation: summary quality
 * is insensitive to model strength, and Opus-tier compaction would silently
 * burn money.
 */
const SUMMARIZE_MODEL = "anthropic/claude-haiku-4.5"

/**
 * Output token cap for the summary. Tuned so the summary itself can't blow
 * a small-context model: 800 tokens ≈ 600 words ≈ a tight paragraph or two.
 */
const SUMMARY_MAX_TOKENS = 800

/**
 * Always preserve at least this many of the most recent messages from
 * compaction. Recent context is what the user is actually working with;
 * summarizing it would lose the rope they're holding.
 */
const KEEP_RECENT_MESSAGES = 4

/**
 * After compaction, leave this much headroom under the model's context
 * limit. Pick the prefix length that brings the projected payload under
 * `target_context * SHRINK_TARGET`.
 */
const SHRINK_TARGET = 0.6

const SUMMARIZE_PROMPT = [
  "You are summarizing earlier turns of a chat so the next turn fits in context.",
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
 * Summarize the oldest contiguous compactable prefix of the conversation
 * into a single synthetic system-role row, then mark each prefix message
 * `summarizedAt` + `summarizedInto`. The chat view filters them out; the
 * send-path keeps the summary row in the prompt.
 *
 * Atomic-ish: summary row is inserted FIRST, then the prefix is updated in
 * a single transaction. If the transaction fails we end up with an unused
 * summary row, which is cosmetically odd but functionally harmless — the
 * filter still walks the (un-summarized) prefix and the next compaction
 * attempt will produce a fresh summary.
 */
export async function compact(opts: {
  conversationId: string
  /** Full conversation, current state. Caller is responsible for passing fresh data. */
  messages: readonly Message[]
  /** Selected model's `context_length`. Drives the prefix-size search. */
  modelContextLength: number
  signal?: AbortSignal
}): Promise<CompactResult> {
  const eligible = opts.messages.filter(
    (m) =>
      m.supersededAt === null &&
      m.summarizedAt === null &&
      m.kind === "normal",
  )

  // Hold back the most recent KEEP_RECENT_MESSAGES — they're current
  // context, not history-to-be-archived.
  const candidates = eligible.slice(0, -KEEP_RECENT_MESSAGES)
  if (candidates.length === 0) {
    return {
      ok: false,
      error:
        "Nothing to compact yet — only recent turns and they always stay.",
    }
  }

  // Decide how big a prefix to summarize: enough to bring the projected
  // payload under SHRINK_TARGET × context. Estimate by chars/4 because
  // we don't have authoritative tokens on user rows.
  const tail = eligible.slice(-KEEP_RECENT_MESSAGES)
  const tailTokens = sumTokens(tail)
  const target = Math.floor(opts.modelContextLength * SHRINK_TARGET)

  let prefix: Message[] = []
  let prefixTokens = 0
  for (const m of candidates) {
    prefix.push(m)
    prefixTokens += estimateTokens(m.content)
    // Once removing this prefix would put us under target (allowing for
    // the eventual summary row, ~SUMMARY_MAX_TOKENS), stop. We err toward
    // a longer prefix — a short one rarely helps.
    const projectedAfter = tailTokens + SUMMARY_MAX_TOKENS
    if (projectedAfter <= target && prefix.length >= 2) break
  }

  // If there's only one prefix candidate or nothing at all to summarize,
  // bail — overhead of a one-message "summary" isn't worth the round trip.
  if (prefix.length < 2) {
    return {
      ok: false,
      error: "Not enough older context to compact yet.",
    }
  }

  const byokKey = await getOpenRouterKey()
  if (!byokKey) {
    return { ok: false, error: "No OpenRouter key configured." }
  }

  // Per-message truncation guards against a single pasted log
  // ballooning the summarizer prompt (and OOM/4xx-ing the request).
  // 4 KB per message × ~30 messages = ~120 KB worst case; well under
  // even Haiku's input window. The summary is meant to be a sketch,
  // not a verbatim record.
  const PER_MESSAGE_LIMIT = 4000
  const transcript = prefix
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
  try {
    const res = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${byokKey}`,
          "X-Title": "Honest AI",
        },
        body: JSON.stringify({
          model: SUMMARIZE_MODEL,
          max_tokens: SUMMARY_MAX_TOKENS,
          messages: [{ role: "user", content: userPrompt }],
        }),
        signal: opts.signal,
      },
    )
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      return {
        ok: false,
        error: `Summarize HTTP ${res.status}: ${text || res.statusText}`,
      }
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    summaryText = (json.choices?.[0]?.message?.content ?? "").trim()
  } catch (e) {
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
    modelId: SUMMARIZE_MODEL,
    status: "complete",
    kind: "summary",
  })

  await markMessagesSummarizedInto(
    prefix.map((m) => m.id),
    summaryRow.id,
  )

  return {
    ok: true,
    summaryId: summaryRow.id,
    summarizedCount: prefix.length,
  }
}

/**
 * Convenience wrapper that loads fresh state from the DB before compacting.
 * Use this when the caller doesn't already have the message list in memory.
 */
export async function compactByConversationId(opts: {
  conversationId: string
  modelContextLength: number
  signal?: AbortSignal
}): Promise<CompactResult> {
  const messages = await listMessages(opts.conversationId)
  return compact({
    conversationId: opts.conversationId,
    messages,
    modelContextLength: opts.modelContextLength,
    signal: opts.signal,
  })
}

function sumTokens(messages: readonly Message[]): number {
  let total = 0
  for (const m of messages) total += estimateTokens(m.content)
  return total
}

/**
 * Compute the projected prompt-token count for the next send turn given
 * the current message list. Caller uses this to decide whether to compact
 * before sending. Excludes superseded + already-summarized rows; includes
 * summary rows themselves (they're still in the prompt).
 */
export function projectPromptTokens(messages: readonly Message[]): number {
  const sendable = messages.filter(
    (m) => m.supersededAt === null && m.summarizedAt === null,
  )
  return sumTokens(sendable)
}
