import type { ResponseStyle } from "@/components/composer/compose-menu"

/**
 * System-prompt prefixes the chat dispatcher prepends per response style.
 * Lives in the request only — never written to the DB — so swapping styles
 * mid-conversation re-applies cleanly without rewriting history.
 *
 * Empty string for "normal" so it's a true passthrough (no extra system
 * message added). Wording is intentionally short — the model is biased
 * by the directive, not lectured by it.
 */
export const STYLE_PROMPTS: Record<ResponseStyle, string> = {
  normal: "",
  learning:
    "Respond patiently and educationally. Build understanding step by step. " +
    "When introducing a concept, briefly explain *why* it matters before diving " +
    "into the *how*. Check the user's current understanding before piling on " +
    "advanced detail. Use short examples in place of long lectures.",
  concise:
    "Keep responses short and dense. Skip preamble like \"Great question!\" or " +
    "\"Sure, here's…\". Lead with the answer, then 1–3 lines of supporting " +
    "context only if essential. Prefer bullet points over prose. No closing " +
    "summaries.",
  explanatory:
    "Take an educational tone. Give detailed explanations with worked examples, " +
    "analogies, and the reasoning behind each step. When relevant, contrast " +
    "the topic with related concepts so the user understands the boundaries. " +
    "Aim for thoroughness over brevity.",
  formal:
    "Use clear, well-structured prose. Use headings, numbered lists, and " +
    "code blocks where they aid clarity. Maintain a professional, objective " +
    "tone — no slang, no contractions, no informal interjections.",
}

/** Returns the directive for the given style, or null when no prefix
 *  should be prepended (the "normal" passthrough case). */
export function styleSystemPrompt(style: ResponseStyle): string | null {
  const text = STYLE_PROMPTS[style]
  return text ? text : null
}
