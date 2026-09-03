import { describe, expect, it } from "vitest"

import { estimateTokens, formatUsd, pricePerMillionFromPerToken } from "./cost"

describe("pricePerMillionFromPerToken", () => {
  it("converts OpenRouter's per-token string prices to per-million", () => {
    // e.g. Haiku input at $3/M arrives as "0.000003"
    expect(pricePerMillionFromPerToken("0.000003")).toBeCloseTo(3)
    expect(pricePerMillionFromPerToken("0.000015")).toBeCloseTo(15)
    expect(pricePerMillionFromPerToken("0.000000")).toBe(0)
  })

  it("accepts numeric input", () => {
    expect(pricePerMillionFromPerToken(0.000003)).toBeCloseTo(3)
    expect(pricePerMillionFromPerToken(0)).toBe(0)
  })

  it("returns 0 for garbage instead of NaN poisoning cost math", () => {
    expect(pricePerMillionFromPerToken("free")).toBe(0)
    expect(pricePerMillionFromPerToken("")).toBe(0)
    expect(pricePerMillionFromPerToken(Number.NaN)).toBe(0)
  })
})

describe("estimateTokens", () => {
  it("is ~chars/4, rounded up", () => {
    expect(estimateTokens("")).toBe(0)
    expect(estimateTokens("abcd")).toBe(1)
    expect(estimateTokens("abcde")).toBe(2)
    expect(estimateTokens("a".repeat(400))).toBe(100)
  })
})

describe("formatUsd", () => {
  it("scales decimals with magnitude", () => {
    expect(formatUsd(0.0003)).toBe("$0.0003")
    expect(formatUsd(0.024)).toBe("$0.024")
    expect(formatUsd(1.234)).toBe("$1.23")
    expect(formatUsd(12)).toBe("$12.00")
  })

  it("keeps the <$0.01 bucket for sub-cent real costs", () => {
    // A typical Haiku turn must not render as $0.00
    expect(formatUsd(0.00029)).toBe("$0.0003")
  })
})
