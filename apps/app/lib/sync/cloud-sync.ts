/**
 * Cloud sync adapter — stubs for Phase 1, wired up in Phase 2+.
 *
 * This module is the **only** place that knows about the server API for
 * conversation sync. Everything else (sidebar, chat screen, search) talks
 * to `ConversationsProvider`, which calls these functions when the user
 * has an active auth session.
 *
 * Design principles:
 *  - Local-first: the app never blocks UI on network. Cloud data merges in
 *    the background.
 *  - Offline-robust: every function catches network errors and returns
 *    empty / null so the merge logic degrades gracefully.
 *  - No auth coupling: this module doesn't import Better Auth. The caller
 *    passes the bearer token explicitly.
 */

import type { Conversation, Message } from "@honestea/shared"

/** Sentinel returned when the user has no auth session. */
export const NO_AUTH = Symbol("no-auth")

export interface CloudFetchResult {
  conversations: Conversation[]
  /** Server timestamp (ms) of the most recently modified row. */
  serverCursor: number
}

export interface PushResult {
  success: boolean
  /** Server-assigned IDs for any newly-created conversations. */
  idMapping?: Record<string, string>
}

/**
 * Fetch the user's cloud conversation list + latest cursor.
 *
 * Phase 1 stub: always returns empty (no auth, no server).
 * Phase 2: replace with `fetch(api.honestai.app/api/conversations)`.
 */
export async function fetchCloudConversations(_opts: {
  token: string
  cursor?: number
}): Promise<CloudFetchResult | typeof NO_AUTH> {
  // TODO(Epic 3): Wire to Elysia /api/conversations
  return { conversations: [], serverCursor: 0 }
}

/**
 * Fetch messages for a single cloud conversation.
 *
 * Phase 1 stub: returns null (local-only).
 * Phase 2: hydrate into SQLite on demand so the chat screen doesn't
 * need to know whether a conversation is local or cloud.
 */
export async function fetchCloudMessages(_opts: {
  token: string
  conversationId: string
}): Promise<Message[] | null> {
  // TODO(Epic 3): Wire to Elysia /api/conversations/:id/messages
  return null
}

/**
 * Push a dirty local conversation to the server.
 *
 * Phase 1 stub: no-op.
 * Phase 2: POST conversation + messages; server returns canonical IDs.
 */
export async function pushConversationToCloud(_opts: {
  token: string
  conversation: Conversation
  messages: Message[]
}): Promise<PushResult> {
  // TODO(Epic 3): Wire to Elysia /api/conversations (POST/PUT)
  return { success: false }
}
