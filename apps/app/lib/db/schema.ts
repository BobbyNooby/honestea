import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core"

/**
 * SQLite schema for Phase 1 local-only conversation storage.
 *
 * The same column shape will be mirrored in `apps/server` Postgres when
 * cloud sync ships — both tables produce values that satisfy the
 * `Conversation` and `Message` interfaces in `@honestea/shared`.
 *
 * All timestamps are ms epoch integers (smaller than ISO strings, easier
 * sort, matches `Date.now()`).
 */

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  title: text("title"),
  modelId: text("model_id").notNull(),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
  starred: integer("starred", { mode: "boolean" }).notNull().default(false),
  syncedAt: integer("synced_at"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
})

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role", {
    enum: ["user", "assistant", "system"],
  }).notNull(),
  content: text("content").notNull(),
  modelId: text("model_id"),
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  /**
   * Real USD cost stored as a float. Source of truth from OpenRouter's
   * `usage.cost`. Lets us show sub-cent precision (typical Haiku turn is
   * ~$0.0003) without losing it to integer rounding.
   */
  costUsd: real("cost_usd"),
  /** @deprecated kept for legacy rows; new writes populate `cost_usd` instead. */
  costCents: integer("cost_cents"),
  status: text("status", {
    enum: ["pending", "streaming", "complete", "error"],
  })
    .notNull()
    .default("complete"),
  /**
   * ms epoch when this message was superseded by a regenerate. Non-null →
   * hidden in the chat view + skipped when sending context to the model,
   * but its cost still counts toward the conversation total. Lets the
   * status row's "trailing cost" actually roll forward instead of resetting
   * each regenerate.
   */
  supersededAt: integer("superseded_at"),
  /**
   * ms epoch when this message was rolled into a summary as part of a
   * compaction. Non-null → hidden in the chat view + skipped from the
   * model send-path. Cost still counts. Distinct from supersededAt because
   * a single row could in principle be both regenerated AND summarized.
   */
  summarizedAt: integer("summarized_at"),
  /**
   * FK → messages.id for the synthetic summary row that replaces this row
   * in the model send-path. Null when not summarized. Lets us walk back
   * from a summarized prefix to its summary if we ever expose
   * "expand summary" in the UI.
   */
  summarizedInto: text("summarized_into"),
  /**
   * "normal" = regular user/assistant/system turn.
   * "summary" = synthetic system-role row containing a Haiku-generated
   *   summary of older turns. Hidden in the chat list; sent to the model
   *   as a system message.
   */
  kind: text("kind", { enum: ["normal", "summary"] })
    .notNull()
    .default("normal"),
  createdAt: integer("created_at").notNull(),
})

export type ConversationRow = typeof conversations.$inferSelect
export type ConversationInsert = typeof conversations.$inferInsert
export type MessageRow = typeof messages.$inferSelect
export type MessageInsert = typeof messages.$inferInsert
