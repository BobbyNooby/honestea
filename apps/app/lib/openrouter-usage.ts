/**
 * Fetch the live key info from OpenRouter's `/api/v1/key` endpoint —
 * source of truth for credit balance, lifetime + per-period usage, and
 * free-tier rate-limit eligibility.
 *
 * Powers the `/settings/usage` page. The /byok save flow already pings
 * a smaller subset of this endpoint via `validateKey`; this helper is
 * the full-fat read we use for the user-facing usage view.
 */

export interface OpenRouterUsage {
  /** Human label set on the key in OR's dashboard. */
  label: string
  /** Credit cap (USD). Null = no cap. */
  limit: number | null
  /** Credits remaining vs the cap. Null when limit is null. */
  limitRemaining: number | null
  /** Whether external BYOK provider usage counts toward the cap. */
  includeByokInLimit: boolean
  /**
   * `true` when the user has never purchased ≥ $10 in OR credits — caps
   * free-model usage to 50 RPD instead of 1000 RPD.
   */
  isFreeTier: boolean
  /** Lifetime credits consumed (USD). */
  usage: number
  usageDaily: number
  usageWeekly: number
  usageMonthly: number
  /** Same fields for traffic that OR proxied to a *non-OR* BYOK provider. */
  byokUsage: number
  byokUsageDaily: number
  byokUsageWeekly: number
  byokUsageMonthly: number
}

interface RawKeyResponse {
  data: {
    label: string
    limit: number | null
    limit_remaining: number | null
    include_byok_in_limit?: boolean
    is_free_tier: boolean
    usage: number
    usage_daily: number
    usage_weekly: number
    usage_monthly: number
    byok_usage: number
    byok_usage_daily: number
    byok_usage_weekly: number
    byok_usage_monthly: number
  }
}

export async function fetchOpenRouterUsage(
  apiKey: string,
): Promise<OpenRouterUsage> {
  const res = await fetch("https://openrouter.ai/api/v1/key", {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`)
  }
  const json = (await res.json()) as RawKeyResponse
  const d = json.data
  return {
    label: d.label,
    limit: d.limit,
    limitRemaining: d.limit_remaining,
    includeByokInLimit: d.include_byok_in_limit ?? false,
    isFreeTier: d.is_free_tier,
    usage: d.usage,
    usageDaily: d.usage_daily,
    usageWeekly: d.usage_weekly,
    usageMonthly: d.usage_monthly,
    byokUsage: d.byok_usage,
    byokUsageDaily: d.byok_usage_daily,
    byokUsageWeekly: d.byok_usage_weekly,
    byokUsageMonthly: d.byok_usage_monthly,
  }
}
