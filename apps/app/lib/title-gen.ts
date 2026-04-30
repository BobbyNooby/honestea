import { getOpenRouterKey } from "./byok"

/**
 * Always use the cheapest curated model for title generation regardless of
 * which model the user picked for the chat. Title quality is insensitive
 * to model strength and Opus-tier title gen is a real waste in aggregate
 * — same call pattern Claude.com and ChatGPT use.
 */
const TITLE_MODEL = "anthropic/claude-haiku-4.5"

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
  signal?: AbortSignal
}): Promise<string | null> {
  const byokKey = await getOpenRouterKey()
  if (!byokKey) return null

  const prompt =
    `${TITLE_PROMPT_PREFIX}\n\n` +
    `User: ${truncate(opts.userMessage, 800)}\n\n` +
    `Assistant: ${truncate(opts.assistantResponse, 800)}`

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${byokKey}`,
        "X-Title": "Honest AI",
      },
      body: JSON.stringify({
        model: TITLE_MODEL,
        max_tokens: 24,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: opts.signal,
    })
    if (!res.ok) return null
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
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
