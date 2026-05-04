import { randomUUID } from "expo-crypto"
import { and, asc, desc, eq, gte, isNotNull, isNull, sql } from "drizzle-orm"

import type {
  Attachment,
  ChatProvider,
  Conversation,
  Message,
  MessageKind,
  MessageStatus,
  Role,
} from "@honestea/shared"

import { db } from "./index"
import { conversations, messages, usageEvents } from "./schema"

/**
 * Repository layer. Returns `@honestea/shared` types so the rest of the
 * app stays decoupled from drizzle. Drizzle's column mapping already
 * matches the shared shape (user_id ↔ userId, etc.) so most functions
 * can return rows directly.
 */

const now = () => Date.now()

export async function createConversation(opts: {
  modelId: string
}): Promise<Conversation> {
  const ts = now()
  const row = {
    id: randomUUID(),
    userId: null,
    title: null,
    modelId: opts.modelId,
    archived: false,
    starred: false,
    syncedAt: null,
    createdAt: ts,
    updatedAt: ts,
  } as const
  await db.insert(conversations).values(row)
  return row
}

export async function listConversations(): Promise<Conversation[]> {
  // Starred chats float to the top, then by recency. Drizzle's orderBy with
  // multiple columns applies left-to-right.
  return db
    .select()
    .from(conversations)
    .where(eq(conversations.archived, false))
    .orderBy(desc(conversations.starred), desc(conversations.updatedAt))
}

export async function setConversationStarred(
  id: string,
  starred: boolean,
): Promise<void> {
  await db
    .update(conversations)
    .set({ starred, updatedAt: now() })
    .where(eq(conversations.id, id))
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const rows = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id))
    .limit(1)
  return rows[0] ?? null
}

export async function deleteConversation(id: string): Promise<void> {
  await db.delete(conversations).where(eq(conversations.id, id))
}

export async function renameConversation(
  id: string,
  title: string,
): Promise<void> {
  await db
    .update(conversations)
    .set({ title, updatedAt: now() })
    .where(eq(conversations.id, id))
}

export async function setConversationModel(
  id: string,
  modelId: string,
): Promise<void> {
  await db
    .update(conversations)
    .set({ modelId, updatedAt: now() })
    .where(eq(conversations.id, id))
}

export async function listMessages(
  conversationId: string,
): Promise<Message[]> {
  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt))
}

export async function addMessage(input: {
  conversationId: string
  role: Role
  content: string
  modelId?: string | null
  status?: MessageStatus
  kind?: MessageKind
  provider?: ChatProvider | null
  attachments?: Attachment[] | null
}): Promise<Message> {
  const row = {
    id: randomUUID(),
    conversationId: input.conversationId,
    role: input.role,
    content: input.content,
    modelId: input.modelId ?? null,
    promptTokens: null,
    completionTokens: null,
    costUsd: null,
    costCents: null,
    status: input.status ?? "complete",
    supersededAt: null,
    summarizedAt: null,
    summarizedInto: null,
    kind: input.kind ?? "normal",
    provider: input.provider ?? null,
    citations: null,
    toolCalls: null,
    attachments: input.attachments ?? null,
    createdAt: now(),
  } as const
  await db.insert(messages).values(row)
  await db
    .update(conversations)
    .set({ updatedAt: row.createdAt })
    .where(eq(conversations.id, input.conversationId))
  return row
}

export async function updateMessage(
  id: string,
  patch: Partial<
    Pick<
      Message,
      | "content"
      | "status"
      | "promptTokens"
      | "completionTokens"
      | "costUsd"
      | "costCents"
      | "modelId"
      | "provider"
      | "citations"
      | "toolCalls"
    >
  >,
): Promise<void> {
  await db.update(messages).set(patch).where(eq(messages.id, id))
}

/**
 * Mark a specific list of messages as summarized into the given summary
 * row. Done as a single transaction so partial failure can't leave half
 * the prefix marked summarized while the rest still feed the model.
 */
export async function markMessagesSummarizedInto(
  messageIds: readonly string[],
  summaryId: string,
): Promise<void> {
  if (messageIds.length === 0) return
  const ts = now()
  await db.transaction(async (tx) => {
    for (const id of messageIds) {
      await tx
        .update(messages)
        .set({ summarizedAt: ts, summarizedInto: summaryId })
        .where(eq(messages.id, id))
    }
  })
}

/**
 * Set or clear the `supersededAt` flag on a single message. Used by the
 * regenerate version-switcher to flip which version of a turn is the
 * "active" (non-superseded) one — clear on the version we want to show,
 * set on the previously-active one.
 */
export async function setMessageSupersededAt(
  id: string,
  value: number | null,
): Promise<void> {
  await db
    .update(messages)
    .set({ supersededAt: value })
    .where(eq(messages.id, id))
}

/**
 * Mark every non-superseded message at-or-after the given timestamp as
 * superseded. Used by regenerate: replaces the prior assistant turn (and
 * anything after) without deleting them, so their cost still rolls into
 * the conversation total. Idempotent — already-superseded rows are left
 * alone so we don't overwrite their original supersededAt timestamp.
 */
export async function markMessagesSupersededFrom(
  conversationId: string,
  sinceCreatedAt: number,
): Promise<void> {
  await db
    .update(messages)
    .set({ supersededAt: now() })
    .where(
      and(
        eq(messages.conversationId, conversationId),
        gte(messages.createdAt, sinceCreatedAt),
        isNull(messages.supersededAt),
      ),
    )
}

/**
 * Flip any messages stuck in `streaming` (because the app crashed or was
 * force-quit mid-response) to `error`. Run once on app start.
 */
export async function sweepStreamingMessages(): Promise<number> {
  const result = await db
    .update(messages)
    .set({ status: "error" })
    .where(and(eq(messages.status, "streaming")))
  return (result as { changes?: number }).changes ?? 0
}

export interface UsageTotals {
  totalPromptTokens: number
  totalCompletionTokens: number
  totalCostUsd: number
  /** Count of assistant turns with token data (excludes pending/error rows). */
  countedTurns: number
}

/**
 * Aggregate prompt + completion tokens and total cost from the immutable
 * `usage_events` ledger. Survives chat deletion — the ledger is never
 * touched when a conversation is removed, so lifetime usage stats stay
 * accurate even after history cleanup.
 *
 * Powers the Savings card on the usage screen. The migration v9 backfill
 * seeds the ledger from existing assistant messages on first launch
 * after upgrade, so users don't lose prior totals.
 */
export async function getUsageTotals(): Promise<UsageTotals> {
  const [row] = await db
    .select({
      totalPromptTokens: sql<number>`coalesce(sum(${usageEvents.promptTokens}), 0)`,
      totalCompletionTokens: sql<number>`coalesce(sum(${usageEvents.completionTokens}), 0)`,
      totalCostUsd: sql<number>`coalesce(sum(${usageEvents.costUsd}), 0)`,
      countedTurns: sql<number>`count(${usageEvents.id})`,
    })
    .from(usageEvents)
  return {
    totalPromptTokens: Number(row?.totalPromptTokens ?? 0),
    totalCompletionTokens: Number(row?.totalCompletionTokens ?? 0),
    totalCostUsd: Number(row?.totalCostUsd ?? 0),
    countedTurns: Number(row?.countedTurns ?? 0),
  }
}

/**
 * Append a usage event to the immutable ledger. Called once per
 * successful assistant completion from the chat dispatcher.
 *
 * Skips when token counts are missing (free-tier rate-limited turns,
 * mid-stream errors with no usage block, etc.) — recording a zero-token
 * event would skew the per-turn averages.
 */
export async function recordUsageEvent(input: {
  modelId: string
  provider: ChatProvider
  promptTokens: number
  completionTokens: number
  costUsd: number
  messageId?: string | null
}): Promise<void> {
  if (
    !Number.isFinite(input.promptTokens) ||
    !Number.isFinite(input.completionTokens) ||
    input.promptTokens <= 0
  ) {
    return
  }
  await db.insert(usageEvents).values({
    id: randomUUID(),
    modelId: input.modelId,
    provider: input.provider,
    promptTokens: input.promptTokens,
    completionTokens: input.completionTokens,
    costUsd: input.costUsd,
    createdAt: now(),
    messageId: input.messageId ?? null,
  })
}

/** One model's slice of an aggregated usage period. */
export interface UsageBreakdownRow {
  modelId: string
  costUsd: number
  promptTokens: number
  completionTokens: number
  /** Number of assistant turns this model produced in the period. */
  turns: number
}

/** Today's per-model slice + the tool-call count for the receipt card. */
export interface TodaysUsageBreakdown {
  byModel: UsageBreakdownRow[]
  /** Total assistant tool invocations today across `messages.tool_calls`. */
  toolCallCount: number
  /** Sum of `usage_events.cost_usd` for today (matches `byModel` totals). */
  totalCostUsd: number
  /** Number of usage-event rows today (= billable assistant turns). */
  messageCount: number
}

/** Local-timezone start-of-day in ms epoch. */
function startOfTodayMs(): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/**
 * Per-model spend + token volume for today's usage events, plus a count
 * of server-tool invocations from today's assistant messages. Drives the
 * "Today's chat" receipt card on the Usage screen.
 *
 * Tool-call count is derived from `messages.tool_calls` (a JSON-encoded
 * `PersistedToolCall[]`) so we don't need a dedicated column. The cost
 * of those tools doesn't show up on `usage_events` rows by itself —
 * OR's `usage.cost` rolls tool fees into the per-turn cost, so the
 * receipt's "Web search × N" line is computed at the call site as
 * `total - sum(per-model)` (or omitted when that delta is ≤ 0).
 */
export async function getTodaysUsageBreakdown(): Promise<TodaysUsageBreakdown> {
  const since = startOfTodayMs()

  const byModelRows = await db
    .select({
      modelId: usageEvents.modelId,
      costUsd: sql<number>`coalesce(sum(${usageEvents.costUsd}), 0)`,
      promptTokens: sql<number>`coalesce(sum(${usageEvents.promptTokens}), 0)`,
      completionTokens: sql<number>`coalesce(sum(${usageEvents.completionTokens}), 0)`,
      turns: sql<number>`count(${usageEvents.id})`,
    })
    .from(usageEvents)
    .where(gte(usageEvents.createdAt, since))
    .groupBy(usageEvents.modelId)
    .orderBy(desc(sql`sum(${usageEvents.costUsd})`))

  const byModel: UsageBreakdownRow[] = byModelRows.map((r) => ({
    modelId: r.modelId,
    costUsd: Number(r.costUsd ?? 0),
    promptTokens: Number(r.promptTokens ?? 0),
    completionTokens: Number(r.completionTokens ?? 0),
    turns: Number(r.turns ?? 0),
  }))

  const totalCostUsd = byModel.reduce((acc, r) => acc + r.costUsd, 0)
  const messageCount = byModel.reduce((acc, r) => acc + r.turns, 0)

  // tool_calls is a JSON-encoded array on each assistant row. We don't
  // need a JSON parser here — counting the number of {"name": ...}
  // entries via SQL is enough. Fall back to JS-side parsing for the
  // small set of today's tool-bearing rows so we stay accurate even if
  // future tool entries omit the `name` key.
  const toolRows = await db
    .select({ toolCalls: messages.toolCalls })
    .from(messages)
    .where(
      and(
        eq(messages.role, "assistant"),
        gte(messages.createdAt, since),
        isNotNull(messages.toolCalls),
      ),
    )

  let toolCallCount = 0
  for (const row of toolRows) {
    const calls = row.toolCalls
    if (Array.isArray(calls)) toolCallCount += calls.length
  }

  return { byModel, toolCallCount, totalCostUsd, messageCount }
}

/** One model's lifetime slice for the "By model · all time" card. */
export interface ModelUsageRow {
  modelId: string
  costUsd: number
  /** Total assistant turns this model produced. */
  turns: number
  /** Prompt + completion tokens summed. */
  tokens: number
}

/**
 * Lifetime per-model breakdown from `usage_events`, sorted by spend
 * descending. Drives the "By model · all time" card on the Usage screen.
 *
 * Like `getUsageTotals`, this reads the immutable ledger so deleted
 * conversations still contribute — the totals reflect what the user
 * actually paid for, not what's currently in the chat list.
 */
export async function getUsageByModel(): Promise<ModelUsageRow[]> {
  const rows = await db
    .select({
      modelId: usageEvents.modelId,
      costUsd: sql<number>`coalesce(sum(${usageEvents.costUsd}), 0)`,
      turns: sql<number>`count(${usageEvents.id})`,
      tokens: sql<number>`coalesce(sum(${usageEvents.promptTokens} + ${usageEvents.completionTokens}), 0)`,
    })
    .from(usageEvents)
    .groupBy(usageEvents.modelId)
    .orderBy(desc(sql`sum(${usageEvents.costUsd})`))

  return rows.map((r) => ({
    modelId: r.modelId,
    costUsd: Number(r.costUsd ?? 0),
    turns: Number(r.turns ?? 0),
    tokens: Number(r.tokens ?? 0),
  }))
}
