import { describe, expect, it } from "vitest"

import {
  CURATED_MODELS,
  DEFAULT_CURATED_MODEL_ID,
  TRENDING_MODELS,
  curatedModelsByTier,
} from "./curated-models"

describe("curated models", () => {
  it("has unique OpenRouter slugs", () => {
    const ids = CURATED_MODELS.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("pins the default to a member of the curated list", () => {
    expect(
      CURATED_MODELS.some((m) => m.id === DEFAULT_CURATED_MODEL_ID),
    ).toBe(true)
  })

  it("every curated id appears in trending exactly once at most", () => {
    expect(new Set(TRENDING_MODELS).size).toBe(TRENDING_MODELS.length)
  })

  it("has no empty display names or descriptions", () => {
    for (const m of CURATED_MODELS) {
      expect(m.displayName.trim().length).toBeGreaterThan(0)
      expect(m.shortName.trim().length).toBeGreaterThan(0)
      expect(m.description.trim().length).toBeGreaterThan(0)
    }
  })

  it("groups into the three tiers in fixed order, each non-empty", () => {
    const groups = curatedModelsByTier()
    expect(groups.map((g) => g.tier)).toEqual(["flagship", "workhorse", "basic"])
    for (const g of groups) expect(g.models.length).toBeGreaterThan(0)
  })
})
