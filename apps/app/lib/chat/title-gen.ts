import { client } from "../client"
import { getOpenRouterKey } from "../byok"

/**
 * Default model for title generation. Falls back to Haiku when the caller
 * doesn't specify a model — same class of bug as the old compaction
 * hardcoded slug: if Haiku is deprecated, title gen silently returns null.
 * Callers that know the current chat model should pass it via
 * `titleModel` so the call always works.
 */
const DEFAULT_TITLE_MODEL = "anthropic/claude-haiku-4.5"

const TITLE_PROMPT_PREFIX =
  "Generate a 3-6 word title for this conversation. " +
  "Return ONLY the title — no quotes, no trailing punctuation, no newlines."

/**
 * Returns a sanitized title string, or null if anything went wrong (no key,
 * network error, model returned empty/garbage). Caller decides whether to
 * keep the existing null/"New chat" placeholder.
 *
 * Fire-and-forget: caller should `void generateTitle(...).then(...)` and
 * tolerate failure silently.
 */
export async function generateTitle(opts: {
  userMessage: string
  assistantResponse: string
  /** Model to use for the title call. Defaults to Haiku when not specified. */
  titleModel?: string
  signal?: AbortSignal
}): Promise<string | null> {
  const byokKey = await getOpenRouterKey()
  if (!byokKey) return null

  const model = opts.titleModel || DEFAULT_TITLE_MODEL

  const prompt =
    `${TITLE_PROMPT_PREFIX}\n\n` +
    `User: ${truncate(opts.userMessage, 800)}\n\n` +
    `Assistant: ${truncate(opts.assistantResponse, 800)}`

  try {
    const json = (await client.openrouter.chat({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 24,
      extra: { _apiKey: byokKey },
      signal: opts.signal,
    })) as { choices?: Array<{ message?: { content?: string } }> }
    const raw = json.choices?.[0]?.message?.content ?? ""
    return sanitize(raw)
  } catch {
    return null
  }
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}…` : s
}

function sanitize(s: string): string | null {
  const firstLine = s.split(/\r?\n/)[0] ?? ""
  const stripped = firstLine.replace(/^[\s"'`*_]+|[\s"'`*_.,;:!?]+$/g, "").trim()
  if (!stripped) return null
  return stripped.slice(0, 60)
}
