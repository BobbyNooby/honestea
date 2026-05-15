/**
 * Conversation history retrieval for the AI model.
 *
 * When the user asks about their past conversations ("summarize my
 * chats", "what did we talk about yesterday", "search my history"),
 * this module queries the local SQLite DB, finds relevant past
 * conversations, and formats them into a context block the model can
 * reference.
 *
 * The detection is keyword-based (cheap, zero-latency). If no history
 * intent is detected, the module returns null and the chat proceeds
 * normally with zero overhead.
 */

import type { Conversation, Message } from "@honestea/shared"

import { listConversations, listMessages } from "@/lib/db/repository"

/**
 * Returns true if the user message appears to be asking about
 * conversation history.
 *
 * Two-layer check:
 *  1. Must contain a history-related noun (chat, convo, conversation, talk, history).
 *  2. Must contain an action/context word suggesting they want to look back.
 *
 * This catches flexible phrasing like:
 *  - "summarize my old conversations"
 *  - "try summarising old convos"
 *  - "what did we talk about before"
 *  - "go over my chat history"
 */
export function isHistoryIntent(text: string): boolean {
  const t = text.toLowerCase()

  // Layer 1: history noun (word boundary to avoid false positives)
  const hasNoun = /\b(chats?|convos?|conversations?|talks?|histories?|discussions?)\b/.test(t)
  if (!hasNoun) {
    console.log("[history-query] ❌ no history noun:", t)
    return false
  }

  // Layer 2: action / context suggesting retrospection
  // Uses substring matching (no \b) so stems like "summariz" catch
  // summarize, summarizing, summarised, etc.
  const hasVerb = /(summariz|summaris|recap|review|search|find|look up|remember|recall|what did|what have|previous|past|earlier|last|old|all my|all our|go over|check|show|list)/i.test(t)

  if (hasVerb) {
    console.log("[history-query] ✅ intent detected:", t)
    return true
  }

  console.log("[history-query] ❌ has noun but no verb:", t)
  return false
}

export interface HistoryContext {
  /** The formatted context block to inject as a system message. */
  systemMessage: string
  /** How many conversations were included. */
  conversationCount: number
  /** How many messages were scanned. */
  messageCount: number
}

export interface RetrieveOpts {
  userText: string
}

/**
 * Retrieve relevant conversation history from the local DB.
 *
 * Strategy: fetch the 10 most recent conversations and summarize the
 * first 2 user + assistant turns from each.
 *
 * NOTE: we intentionally do NOT use FTS5 here. FTS5 is great for
 * finding a specific topic ("search my history for React") but bad
 * for history summaries ("list all my conversations") because it
 * filters the result set. When the user asks for a summary, they want
 * all conversations, not a subset that happens to match their query.
 */
export async function retrieveHistoryContext(
  opts: RetrieveOpts,
): Promise<HistoryContext | null> {
  const { userText } = opts
  try {
    const allConvos = await listConversations()
    console.log(`[history-query] 📊 total conversations in DB: ${allConvos.length}`)

    // Always grab the 10 most recent. FTS5 filtering is disabled
    // for history summaries — the model needs the full picture.
    const convos = allConvos.slice(0, 10)

    if (convos.length === 0) {
      console.log("[history-query] ❌ no conversations available at all")
      return null
    }

    console.log(`[history-query] 📋 selected ${convos.length} conversation(s)`)

    // Build a compact summary of each conversation.
    const summaries: string[] = []
    let totalMessages = 0

    for (const c of convos) {
      const msgs = await listMessages(c.id)
      console.log(`[history-query]   - "${c.title ?? "Untitled"}": ${msgs.length} message(s)`)
      totalMessages += msgs.length

      // Pick the first 2 user + assistant pairs as representative.
      const turns: string[] = []
      let userCount = 0
      let assistantCount = 0
      let skipped = 0
      for (const m of msgs) {
        if (m.supersededAt != null || m.summarizedAt != null) {
          skipped++
          continue
        }
        if (m.role === "user" && userCount < 2) {
          const snippet = m.content.slice(0, 200)
          turns.push(`User: ${snippet}${m.content.length > 200 ? "…" : ""}`)
          userCount++
        } else if (m.role === "assistant" && assistantCount < 2) {
          const snippet = m.content.slice(0, 200)
          turns.push(`Assistant: ${snippet}${m.content.length > 200 ? "…" : ""}`)
          assistantCount++
        }
        if (userCount >= 2 && assistantCount >= 2) break
      }

      if (skipped > 0) {
        console.log(`[history-query]     skipped ${skipped} superseded/summarized message(s)`)
      }

      if (turns.length === 0) {
        console.log(`[history-query]     ⚠️ no usable turns (all messages superseded/summarized or empty)`)
        continue
      }

      const dateStr = new Date(c.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
      summaries.push(
        `---\n` +
          `Chat: ${c.title ?? "Untitled"} (${dateStr})\n` +
          turns.join("\n"),
      )
      console.log(`[history-query]     ✅ added summary with ${turns.length} turn(s)`)
    }

    if (summaries.length === 0) {
      console.log("[history-query] ❌ no usable message summaries from any conversation")
      return null
    }

    const systemMessage = [
      `The user is asking about their conversation history.`,
      `Here are summaries of ${summaries.length} past conversation(s).`,
      `Use them to answer accurately. Do not invent conversations that aren't listed.`,
      ``,
      ...summaries,
    ].join("\n")

    console.log(`[history-query] ✅ injected ${summaries.length} conversation(s) into context`)
    return {
      systemMessage,
      conversationCount: summaries.length,
      messageCount: totalMessages,
    }
  } catch (e) {
    console.log("[history-query] ❌ error:", e)
    return null
  }
}
