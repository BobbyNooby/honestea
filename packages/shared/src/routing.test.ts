import { describe, expect, it } from "vitest"

import {
  AUTO_MODEL_ID,
  blendedPricePerMillion,
  pickCheapestModel,
  resolveModelId,
  type RoutableModel,
} from "./routing"

function model(overrides: Partial<RoutableModel> & { id: string }): RoutableModel {
  return {
    context_length: 200_000,
    pricing: { prompt: "0.000003", completion: "0.000015" },
    architecture: { input_modalities: ["text"] },
    supported_parameters: ["tools"],
    ...overrides,
  }
}

const CATALOG: RoutableModel[] = [
  model({ id: "cheap/basic", pricing: { prompt: "0.0000002", completion: "0.0000002" } }),
  model({ id: "mid/vision", pricing: { prompt: "0.000001", completion: "0.000004" }, architecture: { input_modalities: ["text", "image"] } }),
  model({ id: "big/context", context_length: 1_000_000, pricing: { prompt: "0.00001", completion: "0.00003" } }),
  model({ id: "tools/none", supported_parameters: [], pricing: { prompt: "0.0000001", completion: "0.0000001" } }),
]

describe("blendedPricePerMillion", () => {
  it("weights 3 input : 1 output", () => {
    // 3 * 3 + 1 * 15 = 24 / 4
    expect(blendedPricePerMillion({ prompt: "0.000003", completion: "0.000015" })).toBeCloseTo(6)
  })

  it("ranks unparseable pricing as infinitely expensive", () => {
    expect(blendedPricePerMillion({ prompt: "free", completion: "0.000001" })).toBe(Number.POSITIVE_INFINITY)
  })
})

describe("pickCheapestModel", () => {
  it("picks the globally cheapest model with no requirements", () => {
    expect(pickCheapestModel(CATALOG)?.id).toBe("tools/none")
  })

  it("respects the tools requirement", () => {
    const picked = pickCheapestModel(CATALOG, { tools: true })
    expect(picked?.id).toBe("cheap/basic")
  })

  it("respects vision requirement", () => {
    expect(pickCheapestModel(CATALOG, { vision: true })?.id).toBe("mid/vision")
  })

  it("respects minContext", () => {
    expect(pickCheapestModel(CATALOG, { minContext: 500_000 })?.id).toBe("big/context")
  })

  it("combines requirements", () => {
    expect(pickCheapestModel(CATALOG, { vision: true, tools: true, minContext: 300_000 })).toBeNull()
  })

  it("excludes non-positive pricing from ranking", () => {
    const broken = model({ id: "broken/-1", pricing: { prompt: "-1", completion: "-1" } })
    expect(pickCheapestModel([broken], {})?.id).not.toBe("broken/-1")
  })
})

describe("resolveModelId", () => {
  it("passes concrete selections through untouched", () => {
    expect(resolveModelId("mid/vision", CATALOG, { vision: false })).toBe("mid/vision")
  })

  it("returns the AUTO sentinel unchanged when the catalog is empty", () => {
    expect(resolveModelId(AUTO_MODEL_ID, [], {})).toBe(AUTO_MODEL_ID)
  })

  it("routes AUTO to the cheapest model meeting the requirements", () => {
    expect(resolveModelId(AUTO_MODEL_ID, CATALOG, { vision: true })).toBe("mid/vision")
    expect(resolveModelId(AUTO_MODEL_ID, CATALOG, {})).toBe("tools/none")
  })

  it("degrades context first, then vision, then tools", () => {
    // Nothing has both vision and 500k context — context is dropped first,
    // vision still met.
    expect(resolveModelId(AUTO_MODEL_ID, CATALOG, { vision: true, minContext: 500_000 })).toBe("mid/vision")
    // Nothing has vision at all here → drops to tools-only ranking.
    const noVision = CATALOG.map((m) => ({
      ...m,
      architecture: { input_modalities: ["text"] },
    }))
    expect(resolveModelId(AUTO_MODEL_ID, noVision, { vision: true })).toBe("tools/none")
  })
})
