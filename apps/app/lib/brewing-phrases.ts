import { useEffect, useState } from "react"

/**
 * Tea-making phrases used as the "thinking" placeholder while we wait for
 * the first streaming token. Picks a fresh phrase every ~2.2s, on-brand
 * with the cup-and-leaf metaphor — calm, plainspoken, no exclamation
 * marks (per the design system's voice rules).
 */
export const BREWING_PHRASES: readonly string[] = [
  "Brewing",
  "Steeping",
  "Pouring",
  "Whisking matcha",
  "Heating the kettle",
  "Letting it steep",
  "Drawing a cup",
  "Warming the pot",
  "Filtering",
  "Cooling",
  "Stirring",
  "Bringing to temperature",
]

const PHRASE_INTERVAL_MS = 2200

function pickRandom(): string {
  const idx = Math.floor(Math.random() * BREWING_PHRASES.length)
  return BREWING_PHRASES[idx] ?? "Brewing"
}

/**
 * Hook that yields a fresh tea-making phrase on a 2.2s interval. Use as
 * the placeholder caption while an assistant turn is streaming and
 * no content has arrived yet.
 */
export function useBrewingPhrase(active: boolean): string {
  const [phrase, setPhrase] = useState<string>(BREWING_PHRASES[0] ?? "Brewing")

  useEffect(() => {
    if (!active) return
    setPhrase(pickRandom())
    const id = setInterval(() => {
      setPhrase((prev) => {
        // Avoid drawing the same phrase twice in a row.
        let next = pickRandom()
        if (BREWING_PHRASES.length > 1) {
          while (next === prev) next = pickRandom()
        }
        return next
      })
    }, PHRASE_INTERVAL_MS)
    return () => clearInterval(id)
  }, [active])

  return phrase
}
