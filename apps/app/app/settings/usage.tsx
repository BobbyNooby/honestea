import {
  IconAlertTriangle,
  IconChevronDown,
  IconExternalLink,
  IconRefresh,
  IconTrendingUp,
} from "@tabler/icons-react-native"
import { Stack } from "expo-router"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { formatUsd } from "@honestea/shared"

import {
  BYOK_PROVIDERS,
  getKey,
  type ByokProvider,
} from "@/lib/byok"
import {
  getTodaysUsageBreakdown,
  getUsageByModel,
  getUsageTotals,
  type ModelUsageRow,
  type TodaysUsageBreakdown,
  type UsageTotals,
} from "@/lib/db/repository"
import { useModelRegistry } from "@/lib/model"
import {
  TYPE_BODY_SM,
  TYPE_CAPTION,
  TYPE_EYEBROW,
  TYPE_H3,
  TYPE_MICRO,
} from "@/lib/typography"
import {
  buildCounterfactuals,
  fetchOpenRouterUsage,
  type CounterfactualRow,
  type OpenRouterUsage,
} from "@/lib/usage"

/**
 * Per-provider link to where the user can see their actual usage on the
 * provider's own dashboard. We don't try to fetch these in-app — they
 * require admin-level credentials we don't ask for. Cleaner UX to send
 * the user to the source of truth.
 */
const DIRECT_PROVIDER_DASHBOARDS: Record<string, string | null> = {
  anthropic: "https://console.anthropic.com/usage",
  openai: "https://platform.openai.com/usage",
  google: "https://aistudio.google.com/apikey",
  // OR is fully supported in-app; not in this map.
  openrouter: null,
}

/**
 * `/settings/usage` — surface the per-key spend / balance / rate-limit
 * data OR exposes via `GET /api/v1/key`. Direct provider keys (Anthropic,
 * OpenAI, Google) get a "view on their dashboard" button instead — none
 * expose per-key usage without admin-level credentials we don't ask for.
 */
export default function UsageScreen() {
  const dark = useColorScheme() === "dark"
  const { registry } = useModelRegistry()
  const [orUsage, setOrUsage] = useState<OpenRouterUsage | null>(null)
  const [orError, setOrError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [directKeys, setDirectKeys] = useState<readonly ByokProvider[]>([])
  const [totals, setTotals] = useState<UsageTotals | null>(null)
  const [todays, setTodays] = useState<TodaysUsageBreakdown | null>(null)
  const [byModel, setByModel] = useState<readonly ModelUsageRow[]>([])

  const refresh = useCallback(async () => {
    setLoading(true)
    setOrError(null)

    const orProvider = BYOK_PROVIDERS.find((p) => p.id === "openrouter")
    const orKey = orProvider ? await getKey(orProvider) : null
    if (orKey) {
      try {
        setOrUsage(await fetchOpenRouterUsage(orKey))
      } catch (e) {
        setOrError(e instanceof Error ? e.message : "Failed to load OR usage")
        setOrUsage(null)
      }
    } else {
      setOrUsage(null)
    }

    const others = BYOK_PROVIDERS.filter((p) => p.id !== "openrouter")
    const configured: ByokProvider[] = []
    for (const p of others) {
      if (await getKey(p)) configured.push(p)
    }
    setDirectKeys(configured)

    try {
      setTotals(await getUsageTotals())
    } catch {
      setTotals(null)
    }

    try {
      setTodays(await getTodaysUsageBreakdown())
    } catch {
      setTodays(null)
    }

    try {
      setByModel(await getUsageByModel())
    } catch {
      setByModel([])
    }

    setLoading(false)
  }, [])

  // Re-cost the user's actual token spend against the comparison
  // models. Empty when totals are missing or the registry hasn't loaded.
  const comparisons = useMemo<CounterfactualRow[]>(() => {
    if (!totals || totals.countedTurns === 0) return []
    return buildCounterfactuals(totals, registry)
  }, [totals, registry])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <SafeAreaView
      className="flex-1 bg-chamomile-100 dark:bg-chamomile-900"
      edges={["bottom"]}
    >
      <Stack.Screen
        options={{
          title: "Usage",
          headerStyle: { backgroundColor: "transparent" },
          headerRight: () => (
            <Pressable
              onPress={refresh}
              hitSlop={8}
              disabled={loading}
              className="px-2 py-1"
              accessibilityLabel="Refresh"
            >
              {loading ? (
                <ActivityIndicator />
              ) : (
                <IconRefresh
                  size={18}
                  color={dark ? "#e4e4e7" : "#3f3f46"}
                  strokeWidth={1.75}
                />
              )}
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerClassName="p-5 gap-6">
        {todays && todays.messageCount > 0 && (
          <TodaysReceiptCard breakdown={todays} />
        )}

        {byModel.length > 0 && <ByModelCard rows={byModel} />}

        {totals && totals.countedTurns > 0 && (
          <SavingsCard totals={totals} comparisons={comparisons} />
        )}

        {orUsage && <OpenRouterCard usage={orUsage} />}

        {orError && !orUsage && (
          <View className="gap-1 rounded-2xl border border-red-300 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
            <Text className="text-sm font-semibold text-red-700 dark:text-red-300">
              Failed to load OpenRouter usage
            </Text>
            <Text className="text-xs text-red-600 dark:text-red-400">
              {orError}
            </Text>
          </View>
        )}

        {!loading && !orUsage && !orError && (
          <View className="rounded-2xl bg-white p-5 dark:bg-zinc-900">
            <Text className="text-sm text-zinc-500 dark:text-zinc-400">
              No OpenRouter key configured. Add one under Settings → API keys
              to see usage data here.
            </Text>
          </View>
        )}

        {directKeys.length > 0 && <DirectKeysCard providers={directKeys} />}

        <FooterNote />
      </ScrollView>
    </SafeAreaView>
  )
}

function OpenRouterCard({ usage }: { usage: OpenRouterUsage }) {
  const negative = usage.limitRemaining != null && usage.limitRemaining < 0
  // Anchor the proportion bars to lifetime spend (the largest period) so
  // each row's bar fills relative to it.
  const lifetimeSpend = Math.max(usage.usage, 0.0001)
  return (
    <View className="gap-3">
      <SectionLabel>OpenRouter</SectionLabel>

      {usage.limit != null && (
        <CreditCapCard
          used={usage.limit - (usage.limitRemaining ?? usage.limit)}
          limit={usage.limit}
          remaining={usage.limitRemaining ?? 0}
          negative={negative}
        />
      )}

      <View className="overflow-hidden rounded-2xl bg-white dark:bg-zinc-900">
        <View className="gap-1 px-5 py-4">
          <Text className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Key
          </Text>
          <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {usage.label || "(unlabeled)"}
          </Text>
        </View>

        <Divider />

        <UsageRow
          label="Today"
          value={formatUsd(usage.usageDaily)}
          fillFraction={usage.usageDaily / lifetimeSpend}
        />
        <Divider />
        <UsageRow
          label="This week"
          value={formatUsd(usage.usageWeekly)}
          fillFraction={usage.usageWeekly / lifetimeSpend}
        />
        <Divider />
        <UsageRow
          label="This month"
          value={formatUsd(usage.usageMonthly)}
          fillFraction={usage.usageMonthly / lifetimeSpend}
        />
        <Divider />
        <UsageRow
          label="Lifetime"
          value={formatUsd(usage.usage)}
          emphasized
          fillFraction={1}
        />

        {usage.limit != null && (
          <>
            <Divider />
            <UsageRow
              label={negative ? "Balance (negative)" : "Remaining credit"}
              value={
                usage.limitRemaining != null
                  ? formatUsd(usage.limitRemaining)
                  : "—"
              }
              valueClassName={
                negative
                  ? "text-red-600 dark:text-red-400"
                  : undefined
              }
            />
          </>
        )}

        {usage.byokUsage > 0 && (
          <>
            <Divider />
            <View className="px-5 py-3">
              <Text className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                BYOK routed through OR
              </Text>
              <View className="mt-1 flex-row flex-wrap gap-x-4 gap-y-1">
                <SmallStat
                  label="Today"
                  value={formatUsd(usage.byokUsageDaily)}
                />
                <SmallStat
                  label="Week"
                  value={formatUsd(usage.byokUsageWeekly)}
                />
                <SmallStat
                  label="Month"
                  value={formatUsd(usage.byokUsageMonthly)}
                />
                <SmallStat
                  label="Lifetime"
                  value={formatUsd(usage.byokUsage)}
                />
              </View>
            </View>
          </>
        )}
      </View>

      {negative && (
        <View className="flex-row items-start gap-2 rounded-2xl bg-red-50 p-3 dark:bg-red-950">
          <IconAlertTriangle
            size={16}
            color="#dc2626"
            strokeWidth={2}
            style={{ marginTop: 2 }}
          />
          <Text className="flex-1 text-xs text-red-700 dark:text-red-300">
            Negative balance — OR returns 402 on every request, including
            free models. Top up to clear.
          </Text>
        </View>
      )}

      <View className="rounded-2xl bg-white p-4 dark:bg-zinc-900">
        <Text className="text-xs text-zinc-500 dark:text-zinc-400">
          {usage.isFreeTier
            ? "Free-model rate limit: 50 requests / day. Purchase ≥ $10 in OR credits to raise the cap to 1,000 / day."
            : "Free-model rate limit: 1,000 requests / day (unlocked by your past credit purchase)."}
        </Text>
      </View>

      <ExternalLinkButton
        label="Add credits on openrouter.ai"
        href="https://openrouter.ai/credits"
      />
    </View>
  )
}

/**
 * "What this conversation volume would have cost on the flagships" —
 * the transparency-pitch surface. Re-prices the user's actual prompt +
 * completion tokens against Opus / GPT-5 / Gemini Pro and shows the
 * delta. Shows nothing when there's no token history yet (fresh
 * install) or no comparison models in the registry.
 */
function SavingsCard({
  totals,
  comparisons,
}: {
  totals: UsageTotals
  comparisons: readonly CounterfactualRow[]
}) {
  const dark = useColorScheme() === "dark"
  const tint = dark ? "#a8c98a" : "#5b8a3a"
  const totalSaved = comparisons.reduce(
    (acc, c) => acc + Math.max(0, c.savedUsd),
    0,
  )
  return (
    <View className="gap-3">
      <SectionLabel>Savings</SectionLabel>

      <View className="overflow-hidden rounded-2xl bg-white dark:bg-zinc-900">
        <View className="px-5 py-4">
          <View className="flex-row items-center gap-2">
            <IconTrendingUp size={16} color={tint} strokeWidth={1.75} />
            <Text className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              You’ve spent
            </Text>
          </View>
          <Text className="mt-1 text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
            {formatUsd(totals.totalCostUsd)}
          </Text>
          <Text className="mt-0.5 text-[12px] text-zinc-500 dark:text-zinc-400">
            across {totals.countedTurns}{" "}
            {totals.countedTurns === 1 ? "turn" : "turns"} ·{" "}
            {formatTokens(totals.totalPromptTokens)} in ·{" "}
            {formatTokens(totals.totalCompletionTokens)} out
          </Text>
        </View>

        {comparisons.length > 0 && (
          <>
            <Divider />
            <View className="px-5 py-3">
              <Text className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Same chats on flagships
              </Text>
            </View>
            {comparisons.map((row, i) => (
              <View key={row.model.slug}>
                {i > 0 && <Divider />}
                <ComparisonRow row={row} actualSpend={totals.totalCostUsd} />
              </View>
            ))}
            {totalSaved > 0 && (
              <>
                <Divider />
                <View
                  className="flex-row items-center justify-between gap-3 px-5 py-3"
                  style={{ backgroundColor: dark ? "#5b8a3a14" : "#5b8a3a14" }}
                >
                  <Text
                    className="flex-1 text-[13px] font-semibold"
                    style={{ color: tint }}
                  >
                    Total saved vs avg flagship
                  </Text>
                  <Text
                    className="text-base font-bold tabular-nums"
                    style={{ color: tint }}
                  >
                    {formatUsd(totalSaved / comparisons.length)}
                  </Text>
                </View>
              </>
            )}
          </>
        )}
      </View>

      <Text className="px-2 text-[11px] leading-4 text-zinc-500 dark:text-zinc-500">
        Your spend above is the real number — it already includes any
        extras that ran on top of tokens (web search adds ~$0.02 per
        turn that uses it, image generation has its own per-image fee,
        cached prompt reads cost less than fresh reads). The
        counterfactual rows only price the same token volume against
        each flagship’s listed prompt + completion rates — those models
        would tack on similar tool fees if they ran the same searches.
        Treat this as a directional estimate, not an invoice.
      </Text>
    </View>
  )
}

function ComparisonRow({
  row,
  actualSpend,
}: {
  row: CounterfactualRow
  actualSpend: number
}) {
  const dark = useColorScheme() === "dark"
  const positive = row.savedUsd > 0
  const tint = positive
    ? dark ? "#a8c98a" : "#5b8a3a"
    : dark ? "#f87171" : "#dc2626"
  return (
    <View className="gap-1 px-5 py-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 min-w-0 gap-0.5 pr-3">
          <Text
            className="text-[14.5px] font-semibold text-zinc-900 dark:text-zinc-100"
            numberOfLines={1}
          >
            {row.model.display}
          </Text>
          <Text className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {row.model.lab} · would’ve cost{" "}
            <Text className="font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
              {formatUsd(row.hypotheticalCostUsd)}
            </Text>
          </Text>
        </View>
        <View className="items-end">
          <Text
            className="text-[15px] font-bold tabular-nums"
            style={{ color: tint }}
          >
            {positive ? "−" : "+"}
            {formatUsd(Math.abs(row.savedUsd))}
          </Text>
          <Text className="text-[10px] text-zinc-500 dark:text-zinc-400">
            {actualSpend > 0
              ? `${row.multiplier.toFixed(1)}× your spend`
              : "—"}
          </Text>
        </View>
      </View>
    </View>
  )
}

/** Pretty-print a token count: 1.2M / 850K / 9 600 / 42. */
function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M tokens`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K tokens`
  return `${n} tokens`
}

function DirectKeysCard({
  providers,
}: {
  providers: readonly ByokProvider[]
}) {
  return (
    <View className="gap-3">
      <SectionLabel>Direct provider keys</SectionLabel>
      <View className="overflow-hidden rounded-2xl bg-white dark:bg-zinc-900">
        {providers.map((p, idx) => {
          const dashboard = DIRECT_PROVIDER_DASHBOARDS[p.id]
          return (
            <View key={p.id}>
              {idx > 0 && <Divider />}
              <Pressable
                onPress={() => dashboard && Linking.openURL(dashboard)}
                disabled={!dashboard}
                className="flex-row items-center gap-3 px-5 py-4 active:bg-zinc-100 dark:active:bg-zinc-800"
              >
                <View className="flex-1 gap-0.5">
                  <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    {p.name}
                  </Text>
                  {dashboard ? (
                    <Text
                      className="text-xs text-zinc-500 dark:text-zinc-400"
                      numberOfLines={1}
                    >
                      {dashboard.replace(/^https?:\/\//, "")}
                    </Text>
                  ) : (
                    <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                      No public dashboard.
                    </Text>
                  )}
                </View>
                {dashboard && (
                  <IconExternalLink
                    size={16}
                    color="#a1a1aa"
                    strokeWidth={1.75}
                  />
                )}
              </Pressable>
            </View>
          )
        })}
      </View>
    </View>
  )
}

function FooterNote() {
  return (
    <Text className="px-1 pb-4 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
      Direct provider keys (Anthropic, OpenAI, Google) don’t expose
      per-key usage in their public APIs without an admin-level
      credential. Tap a provider above to view your usage on their own
      dashboard — that’s the source of truth for those keys.
    </Text>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      className="px-1 text-zinc-500 dark:text-zinc-400"
      style={TYPE_EYEBROW}
    >
      {children}
    </Text>
  )
}

/** Bare model name without provider prefix — "claude-haiku-4.5" not
 *  "anthropic/claude-haiku-4.5". Mirrors the helper in chat-message.tsx. */
function shortModelName(id: string): string {
  return id.split("/").pop() ?? id
}

/**
 * Receipt card for today's usage. Hidden upstream when there's no
 * activity today, so this component doesn't have to render an empty
 * state. The "Web search × N" line is only shown when the tool fee
 * (total - per-model sum) comes out positive — when the math is muddy
 * (e.g. cost rounding leaves a tiny negative delta) we just omit it
 * rather than fake a number.
 */
function TodaysReceiptCard({ breakdown }: { breakdown: TodaysUsageBreakdown }) {
  const { byModel, toolCallCount, totalCostUsd, messageCount } = breakdown
  const perModelSum = byModel.reduce((acc, r) => acc + r.costUsd, 0)
  // OR's `usage.cost` rolls tool fees into the per-turn cost, but we
  // record one event per turn keyed by model — so the difference between
  // the period total and the sum of per-model rows is dominated by tool
  // fees. Only show the line when (a) there were actual tool calls
  // today, and (b) the delta is positive (meaningfully > $0.0001 to
  // avoid float noise).
  const toolCostDelta = totalCostUsd - perModelSum
  const showToolLine = toolCallCount > 0 && toolCostDelta > 0.0001
  const distinctModels = byModel.length

  return (
    <View className="gap-3">
      <SectionLabel>Today’s chat</SectionLabel>

      <View className="overflow-hidden rounded-2xl border border-chamomile-100 bg-white dark:border-transparent dark:bg-zinc-900">
        <View className="px-5 py-4">
          <Text
            className="text-zinc-900 dark:text-zinc-100"
            style={TYPE_H3}
          >
            Today’s chat
          </Text>
          <Text
            className="mt-1 text-zinc-500 dark:text-zinc-400"
            style={TYPE_CAPTION}
          >
            {messageCount} {messageCount === 1 ? "message" : "messages"} ·{" "}
            {distinctModels} {distinctModels === 1 ? "model" : "models"}
          </Text>
        </View>

        <Divider />

        {byModel.map((row, i) => (
          <View key={row.modelId}>
            {i > 0 && <Divider />}
            <ReceiptRow
              label={shortModelName(row.modelId)}
              value={formatUsd(row.costUsd)}
            />
          </View>
        ))}

        {showToolLine && (
          <>
            <Divider />
            <ReceiptRow
              label={`Web search × ${toolCallCount}`}
              value={formatUsd(toolCostDelta)}
              muted
            />
          </>
        )}

        <View className="h-px bg-zinc-200 dark:bg-zinc-700" />

        <View className="flex-row items-center justify-between px-5 py-4">
          <Text
            className="text-zinc-900 dark:text-zinc-100"
            style={TYPE_BODY_SM}
          >
            Total
          </Text>
          <Text
            className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100"
            style={TYPE_BODY_SM}
          >
            {formatUsd(totalCostUsd)}
          </Text>
        </View>
      </View>
    </View>
  )
}

function ReceiptRow({
  label,
  value,
  muted,
}: {
  label: string
  value: string
  muted?: boolean
}) {
  return (
    <View className="flex-row items-center justify-between px-5 py-3">
      <Text
        className={
          muted
            ? "flex-1 pr-3 text-zinc-500 dark:text-zinc-400"
            : "flex-1 pr-3 text-zinc-700 dark:text-zinc-200"
        }
        style={TYPE_BODY_SM}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text
        className={
          muted
            ? "tabular-nums text-zinc-500 dark:text-zinc-400"
            : "font-medium tabular-nums text-zinc-900 dark:text-zinc-100"
        }
        style={TYPE_BODY_SM}
      >
        {value}
      </Text>
    </View>
  )
}

const BY_MODEL_COLLAPSED_LIMIT = 5

/**
 * Lifetime per-model spend, sorted desc. Top 5 by default with a
 * "Show N more" expander; collapsed back via "Show less" once expanded.
 * Each row's bar fills proportional to the top spender so the visual
 * weight tracks where the money actually went.
 */
function ByModelCard({ rows }: { rows: readonly ModelUsageRow[] }) {
  const [expanded, setExpanded] = useState(false)
  const dark = useColorScheme() === "dark"
  const topSpend = rows[0]?.costUsd ?? 0
  // Proportion bars need a non-zero anchor or every row would render
  // empty; clamp to a tiny floor so the top row always reads as 100%.
  const anchor = Math.max(topSpend, 0.0001)
  const visible = expanded ? rows : rows.slice(0, BY_MODEL_COLLAPSED_LIMIT)
  const overflow = Math.max(0, rows.length - BY_MODEL_COLLAPSED_LIMIT)

  return (
    <View className="gap-3">
      <SectionLabel>By model · all time</SectionLabel>

      <View className="overflow-hidden rounded-2xl border border-chamomile-100 bg-white dark:border-transparent dark:bg-zinc-900">
        {visible.map((row, i) => (
          <View key={row.modelId}>
            {i > 0 && <Divider />}
            <ModelSpendRow
              row={row}
              fillFraction={row.costUsd / anchor}
              dark={dark}
            />
          </View>
        ))}

        {overflow > 0 && (
          <>
            <Divider />
            <Pressable
              onPress={() => setExpanded((v) => !v)}
              className="flex-row items-center justify-center gap-1 px-5 py-3 active:bg-zinc-100 dark:active:bg-zinc-800"
              accessibilityRole="button"
              accessibilityLabel={
                expanded ? "Show fewer models" : `Show ${overflow} more models`
              }
            >
              <Text
                className="text-matcha-600 dark:text-matcha-400"
                style={TYPE_BODY_SM}
              >
                {expanded ? "Show less" : `Show ${overflow} more`}
              </Text>
              <IconChevronDown
                size={14}
                color={dark ? "#a8c98a" : "#5b8a3a"}
                strokeWidth={2}
                style={{
                  transform: [{ rotate: expanded ? "180deg" : "0deg" }],
                }}
              />
            </Pressable>
          </>
        )}
      </View>
    </View>
  )
}

function ModelSpendRow({
  row,
  fillFraction,
  dark,
}: {
  row: ModelUsageRow
  fillFraction: number
  dark: boolean
}) {
  const clamped = Math.max(0, Math.min(1, fillFraction))
  const tint = dark ? "#a8c98a" : "#5b8a3a"
  return (
    <View className="gap-1.5 px-5 py-3">
      <View className="flex-row items-center justify-between">
        <Text
          className="flex-1 pr-3 text-zinc-900 dark:text-zinc-100"
          style={TYPE_BODY_SM}
          numberOfLines={1}
        >
          {shortModelName(row.modelId)}
        </Text>
        <Text
          className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100"
          style={TYPE_BODY_SM}
        >
          {formatUsd(row.costUsd)}
        </Text>
      </View>
      <View className="h-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <View
          className="h-full rounded-full"
          style={{
            width: `${clamped * 100}%`,
            backgroundColor: tint,
          }}
        />
      </View>
      <Text
        className="text-zinc-500 dark:text-zinc-400"
        style={TYPE_MICRO}
      >
        {row.turns} {row.turns === 1 ? "turn" : "turns"} ·{" "}
        {formatTokens(row.tokens)}
      </Text>
    </View>
  )
}

function UsageRow({
  label,
  value,
  emphasized,
  valueClassName,
  fillFraction,
}: {
  label: string
  value: string
  emphasized?: boolean
  valueClassName?: string
  /** 0–1 fraction used to fill an inline bar under the row.
   *  Visualizes how this period compares to the anchor (typically
   *  lifetime). Hidden when undefined. */
  fillFraction?: number
}) {
  const clamped =
    fillFraction != null
      ? Math.max(0, Math.min(1, fillFraction))
      : null
  return (
    <View className="gap-1.5 px-5 py-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-zinc-600 dark:text-zinc-400">{label}</Text>
        <Text
          className={
            valueClassName ??
            (emphasized
              ? "text-base font-semibold tabular-nums text-zinc-900 dark:text-zinc-100"
              : "text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-100")
          }
        >
          {value}
        </Text>
      </View>
      {clamped != null && (
        <View className="h-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <View
            className="h-full rounded-full bg-matcha-500 dark:bg-matcha-400"
            style={{ width: `${clamped * 100}%` }}
          />
        </View>
      )}
    </View>
  )
}

/**
 * Big progress bar showing remaining credit vs cap. Threshold-colored —
 * green up to 75%, amber between 75-90%, red beyond. Negative-balance
 * states get a red bar at full width with a warning sign.
 */
function CreditCapCard({
  used,
  limit,
  remaining,
  negative,
}: {
  used: number
  limit: number
  remaining: number
  negative: boolean
}) {
  const pct = negative ? 1 : Math.max(0, Math.min(1, used / limit))
  const tone = negative
    ? "bg-red-500"
    : pct >= 0.9
      ? "bg-red-500"
      : pct >= 0.75
        ? "bg-amber-500"
        : "bg-matcha-500 dark:bg-matcha-400"
  return (
    <View className="overflow-hidden rounded-2xl bg-white p-4 dark:bg-zinc-900">
      <View className="mb-2 flex-row items-baseline justify-between">
        <Text className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Credit balance
        </Text>
        <Text className="text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">
          {formatUsd(used)} of {formatUsd(limit)}
        </Text>
      </View>
      <View className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <View
          className={`h-full rounded-full ${tone}`}
          style={{ width: `${pct * 100}%` }}
        />
      </View>
      <View className="mt-2 flex-row items-baseline justify-between">
        <Text className="text-[13px] text-zinc-600 dark:text-zinc-400">
          {negative ? "Balance is negative" : "Remaining"}
        </Text>
        <Text
          className={
            negative
              ? "text-[15px] font-semibold tabular-nums text-red-600 dark:text-red-400"
              : "text-[15px] font-semibold tabular-nums text-zinc-900 dark:text-zinc-100"
          }
        >
          {formatUsd(remaining)}
        </Text>
      </View>
    </View>
  )
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {label}
      </Text>
      <Text className="text-xs font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
        {value}
      </Text>
    </View>
  )
}

function Divider() {
  return <View className="h-px bg-zinc-100 dark:bg-zinc-800" />
}

function ExternalLinkButton({
  label,
  href,
}: {
  label: string
  href: string
}) {
  return (
    <Pressable
      onPress={() => Linking.openURL(href)}
      className="flex-row items-center justify-center gap-2 rounded-full bg-matcha-600 px-4 py-3 active:opacity-80 dark:bg-matcha-400"
    >
      <Text className="text-sm font-semibold text-white">{label}</Text>
      <IconExternalLink size={14} color="#ffffff" strokeWidth={2} />
    </Pressable>
  )
}
