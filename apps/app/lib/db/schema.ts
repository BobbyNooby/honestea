import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

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
  costCents: integer("cost_cents"),
  status: text("status", {
    enum: ["pending", "streaming", "complete", "error"],
  })
    .notNull()
    .default("complete"),
  createdAt: integer("created_at").notNull(),
})

export type ConversationRow = typeof conversations.$inferSelect
export type ConversationInsert = typeof conversations.$inferInsert
export type MessageRow = typeof messages.$inferSelect
export type MessageInsert = typeof messages.$inferInsert
