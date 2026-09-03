import { describe, expect, it } from "vitest"

import {
  availableCuratedModels,
  CURATED_MODELS,
  curatedModelsByTier,
  DEFAULT_CURATED_MODEL_ID,
  resolveDefaultModelId,
  TRENDING_MODELS,
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

  it("trending slugs are unique", () => {
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

function catalog(ids: Array<{ id: string; prompt?: string }>) {
  return ids.map(({ id, prompt = "0.000001" }) => ({ id, pricing: { prompt } }))
}

describe("availableCuratedModels", () => {
  it("keeps curated entries that exist in the catalog, in curated order", () => {
    const ids = catalog([{ id: CURATED_MODELS[2].id }, { id: CURATED_MODELS[0].id }])
    const result = availableCuratedModels(ids)
    expect(result.map((m) => m.id)).toEqual([
      CURATED_MODELS[0].id,
      CURATED_MODELS[2].id,
    ])
  })

  it("drops entries missing from the catalog or with non-positive pricing", () => {
    const ids = [
      { id: CURATED_MODELS[0].id, pricing: { prompt: "-1" } },
      { id: CURATED_MODELS[1].id, pricing: { prompt: "0" } },
      { id: CURATED_MODELS[2].id, pricing: { prompt: "0.000003" } },
    ]
    expect(availableCuratedModels(ids).map((m) => m.id)).toEqual([
      CURATED_MODELS[2].id,
    ])
  })

  it("returns nothing when the catalog is empty", () => {
    expect(availableCuratedModels([])).toEqual([])
  })
})

describe("resolveDefaultModelId", () => {
  it("prefers the pinned default while it is still alive", () => {
    const catalogWithDefault = catalog([
      { id: "other/model" },
      { id: DEFAULT_CURATED_MODEL_ID },
    ])
    expect(resolveDefaultModelId(catalogWithDefault)).toBe(DEFAULT_CURATED_MODEL_ID)
  })

  it("falls back to the first curated survivor when the default retires", () => {
    const withoutDefault = catalog([{ id: CURATED_MODELS[3].id }, { id: "other/model" }])
    expect(resolveDefaultModelId(withoutDefault)).toBe(CURATED_MODELS[3].id)
  })

  it("falls back to the first catalog entry when no curated model survives", () => {
    expect(resolveDefaultModelId(catalog([{ id: "other/model" }]))).toBe("other/model")
  })
})
