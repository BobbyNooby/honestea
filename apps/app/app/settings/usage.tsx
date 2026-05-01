import {
  IconAlertTriangle,
  IconExternalLink,
  IconRefresh,
} from "@tabler/icons-react-native"
import { Stack } from "expo-router"
import { useCallback, useEffect, useState } from "react"
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
  fetchOpenRouterUsage,
  type OpenRouterUsage,
} from "@/lib/openrouter-usage"

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
  const [orUsage, setOrUsage] = useState<OpenRouterUsage | null>(null)
  const [orError, setOrError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [directKeys, setDirectKeys] = useState<readonly ByokProvider[]>([])

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

    setLoading(false)
  }, [])

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
  return (
    <View className="gap-3">
      <SectionLabel>OpenRouter</SectionLabel>
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

        <UsageRow label="Today" value={formatUsd(usage.usageDaily)} />
        <Divider />
        <UsageRow label="This week" value={formatUsd(usage.usageWeekly)} />
        <Divider />
        <UsageRow label="This month" value={formatUsd(usage.usageMonthly)} />
        <Divider />
        <UsageRow
          label="Lifetime"
          value={formatUsd(usage.usage)}
          emphasized
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
            <Divider />
            <UsageRow label="Credit cap" value={formatUsd(usage.limit)} />
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
      Direct provider keys (Anthropic, OpenAI, Google) don't expose
      per-key usage in their public APIs without an admin-level
      credential. Tap a provider above to view your usage on their own
      dashboard — that's the source of truth for those keys.
    </Text>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="px-1 text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
      {children}
    </Text>
  )
}

function UsageRow({
  label,
  value,
  emphasized,
  valueClassName,
}: {
  label: string
  value: string
  emphasized?: boolean
  valueClassName?: string
}) {
  return (
    <View className="flex-row items-center justify-between px-5 py-3">
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
