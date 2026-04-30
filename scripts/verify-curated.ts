/**
 * Verifies every entry in `packages/shared/src/curated-models.ts` against
 * OpenRouter's live `/api/v1/models` catalog. Run before each release; the
 * curated slugs were authored by hand and OR rotates ids without notice
 * (e.g. `claude-haiku-4.5` vs `claude-haiku-4-5`, dated suffixes appearing).
 *
 * For each curated id:
 *  - Confirms the slug exists in OR's `data[*].id`.
 *  - Asserts pricing.prompt > 0 and pricing.completion > 0 (preview-tier
 *    models sometimes return "0" until they go GA; we'd fall back to the
 *    chars/4 estimate path silently — better to catch it here).
 *  - Asserts context_length > 0.
 *
 * For misses, prints the 3 closest matches by Levenshtein distance on the
 * slug so the rename target is obvious. Exits non-zero on any miss.
 *
 * Run: `pnpm tsx scripts/verify-curated.ts`
 */

import { CURATED_MODELS } from "../packages/shared/src/curated-models"

interface OpenRouterModel {
  id: string
  context_length: number
  pricing: {
    prompt: string
    completion: string
  }
}

interface OpenRouterModelsResponse {
  data: OpenRouterModel[]
}

async function main(): Promise<void> {
  console.log("Fetching OpenRouter model catalog…")
  const res = await fetch("https://openrouter.ai/api/v1/models")
  if (!res.ok) {
    console.error(`HTTP ${res.status} from OpenRouter`)
    process.exit(2)
  }
  const json = (await res.json()) as OpenRouterModelsResponse
  const allIds = json.data.map((m) => m.id)
  const byId = new Map(json.data.map((m) => [m.id, m]))

  console.log(`Loaded ${allIds.length} models from OpenRouter.\n`)

  let failures = 0
  for (const curated of CURATED_MODELS) {
    const found = byId.get(curated.id)
    if (!found) {
      failures++
      const closest = nearestMatches(curated.id, allIds, 3)
      console.log(`✗ ${curated.id}  (NOT FOUND)`)
      console.log(`    closest matches:`)
      for (const c of closest) console.log(`      - ${c}`)
      console.log()
      continue
    }
    const promptRate = Number.parseFloat(found.pricing.prompt)
    const completionRate = Number.parseFloat(found.pricing.completion)
    const issues: string[] = []
    if (!Number.isFinite(promptRate) || promptRate <= 0)
      issues.push(`prompt pricing is "${found.pricing.prompt}"`)
    if (!Number.isFinite(completionRate) || completionRate <= 0)
      issues.push(`completion pricing is "${found.pricing.completion}"`)
    if (!found.context_length || found.context_length <= 0)
      issues.push(`context_length is ${found.context_length}`)
    if (issues.length > 0) {
      failures++
      console.log(`✗ ${curated.id}  (FOUND, but:)`)
      for (const i of issues) console.log(`    - ${i}`)
      console.log()
    } else {
      console.log(
        `✓ ${curated.id.padEnd(40)} ctx=${found.context_length.toString().padEnd(8)} ` +
          `in=$${(promptRate * 1_000_000).toFixed(2)}/M  out=$${(completionRate * 1_000_000).toFixed(2)}/M`,
      )
    }
  }

  console.log()
  if (failures > 0) {
    console.log(`${failures} of ${CURATED_MODELS.length} curated slug(s) failed verification.`)
    process.exit(1)
  } else {
    console.log(`All ${CURATED_MODELS.length} curated slugs verified.`)
  }
}

function nearestMatches(target: string, candidates: string[], k: number): string[] {
  return candidates
    .map((c) => ({ id: c, d: levenshtein(target, c) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, k)
    .map((x) => x.id)
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length
  const v0 = new Array<number>(b.length + 1)
  const v1 = new Array<number>(b.length + 1)
  for (let i = 0; i <= b.length; i++) v0[i] = i
  for (let i = 0; i < a.length; i++) {
    v1[0] = i + 1
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1
      v1[j + 1] = Math.min(
        v1[j]! + 1,
        v0[j + 1]! + 1,
        v0[j]! + cost,
      )
    }
    for (let j = 0; j <= b.length; j++) v0[j] = v1[j]!
  }
  return v0[b.length]!
}

main().catch((e) => {
  console.error(e)
  process.exit(2)
})
