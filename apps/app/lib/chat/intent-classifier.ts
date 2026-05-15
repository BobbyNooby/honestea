/**
 * LLM-based intent classifier with tool calling.
 *
 * Replaces brittle keyword regex with a cheap model call that decides
 * whether the user needs conversation history (or other tools) before
 * the main chat turn starts.
 *
 * Flow:
 *  1. User sends a message.
 *  2. App fires a non-streaming call to a cheap model (Haiku / Nano).
 *  3. Model can call `query_conversation_history` if it judges the
 *     user is asking about past chats.
 *  4. If the tool fires, execute it (SQLite query) and return the
 *     formatted context. Otherwise return null.
 *
 * Cost: ~$0.0003 per classification (Haiku, ~200 tokens).
 * If no API key is available, silently falls back to null so the
 * chat never breaks.
 */

import { client } from "@/lib/client"
import { getOpenRouterKey } from "@/lib/byok/byok"
import { retrieveHistoryContext } from "./history-query"

const CLASSIFIER_MODEL = "anthropic/claude-haiku-4.5"

const CLASSIFIER_SYSTEM = `You are an intent classifier inside a chat app. Your job is to decide whether the user's latest message requires access to their past conversation history.

Rules:
- Call <query_conversation_history> if the user is asking about previous chats, summaries, what they talked about before, or references to earlier conversations.
- Do NOT call the tool for normal factual questions, creative writing, coding help, or anything that doesn't reference the user's own chat history.
- Be conservative: when in doubt, do NOT call the tool.

Examples that NEED history:
- "summarize my old conversations"
- "what did we talk about yesterday?"
- "remind me what I asked about React"
- "list all my chat titles"

Examples that do NOT need history:
- "how do I write a useEffect hook?"
- "write a poem about tea"
- "what's the weather like?"`

const HISTORY_TOOL = {
  type: "function" as const,
  function: {
    name: "query_conversation_history",
    description:
      "Retrieve summaries of the user's past conversations from their local database. Use when the user asks about previous chats, summaries, or what they talked about before.",
    parameters: {
      type: "object" as const,
      properties: {
        reason: {
          type: "string" as const,
          description: "Brief explanation of why history is needed for this query",
        },
      },
      required: ["reason"],
    },
  },
}

async function resolveApiKey(): Promise<string | null> {
  // Use the user's stored OpenRouter BYOK key. Every model call in
  // Phase 1 is BYOK — the user brings their own key.
  return getOpenRouterKey()
}

/**
 * Run the intent classifier. Returns a history context string if the
 * model decided history was needed; otherwise null.
 */
export async function classifyHistoryIntent(
  userText: string,
): Promise<string | null> {
  const apiKey = await resolveApiKey()
  if (!apiKey) {
    console.log("[intent-classifier] no API key available, skipping")
    return null
  }

  try {
    const json = (await client.openrouter.chat({
      model: CLASSIFIER_MODEL,
      messages: [
        { role: "system", content: CLASSIFIER_SYSTEM },
        { role: "user", content: userText },
      ],
      stream: false,
      tools: [HISTORY_TOOL],
      max_tokens: 150,
      extra: { _apiKey: apiKey },
    })) as Record<string, unknown>

    const choice = (json.choices as Array<Record<string, unknown>>)?.[0]
    const message = choice?.message as Record<string, unknown> | undefined
    const toolCalls = message?.tool_calls as
      | Array<{
          id: string
          type: string
          function: { name: string; arguments: string }
        }>
      | undefined

    if (!toolCalls || toolCalls.length === 0) {
      console.log("[intent-classifier] no tool calls — normal chat")
      return null
    }

    const historyCall = toolCalls.find(
      (t) => t.function?.name === "query_conversation_history",
    )
    if (!historyCall) {
      console.log("[intent-classifier] tool calls but not history — normal chat")
      return null
    }

    console.log(
      "[intent-classifier] history tool called:",
      historyCall.function.arguments,
    )

    // Execute the tool.
    const ctx = await retrieveHistoryContext({ userText })
    if (!ctx) {
      console.log("[intent-classifier] no history context available")
      return null
    }

    console.log(
      `[intent-classifier] injected ${ctx.conversationCount} conversation(s)`,
    )
    return ctx.systemMessage
  } catch (e) {
    console.log("[intent-classifier] error:", e)
    return null
  }
}
