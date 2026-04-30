import { randomUUID } from "expo-crypto"
import { and, asc, desc, eq, gte, isNull } from "drizzle-orm"

import type { Conversation, Message, MessageStatus, Role } from "@honestea/shared"

import { db } from "./index"
import { conversations, messages } from "./schema"

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
    >
  >,
): Promise<void> {
  await db.update(messages).set(patch).where(eq(messages.id, id))
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
