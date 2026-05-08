import { ActivityIndicator, Pressable, Text, useColorScheme, View } from "react-native"

import { estimateTokens, formatUsd, type Message } from "@honestea/shared"

import { findModel, type RegistryModel } from "@/lib/model-registry"

interface Props {
  messages: readonly Message[]
  modelId: string
  registry: readonly RegistryModel[] | null
  /** In-progress composer text — added to the live token count so the bar
   *  ticks up as the user types instead of only after send. */
  draft?: string
  /** Tap handler for the "Compact now" link, surfaced once the bar enters
   *  the warning band and there's at least one summarizable message. Null
   *  hides the link. */
  onCompactNow?: () => void
  /** When true, compaction is in progress — show a spinner/label instead
   *  of the normal bar. */
  compacting?: boolean
}

/**
 * Status row above the composer: context-window usage on the left, trailing
 * conversation cost on the right. Both numbers recompute against the
 * currently selected model — switching models mid-chat reflects the new
 * ceiling immediately.
 *
 * Color of the bar interpolates smoothly from a muted zinc through amber
 * to red as the percentage rises through the 60% / 80% / 100% bands. The
 * older discrete tone-flip felt jarring at thresholds; the gradient signals
 * "you're heading toward a limit" without surprising the user with a sudden
 * change.
 */
export function ChatStatusRow({
  messages,
  modelId,
  registry,
  draft = "",
  onCompactNow,
  compacting = false,
}: Props) {
  const dark = useColorScheme() === "dark"
  const model = registry ? findModel(registry, modelId) : null
  const limit = model?.context_length ?? 0

  // Visible (non-superseded, non-summarized) messages drive the projected
  // send-path token count. Superseded/summarized rows still count for cost
  // (in the cost rollup below) but not for context-window math.
  const visibleForSend = messages.filter(
    (m) => m.supersededAt === null && m.summarizedAt === null,
  )
  const committedTokens = estimateConversationTokens(visibleForSend)
  const draftTokens = draft ? estimateTokens(draft) : 0
  const used = committedTokens + draftTokens
  const totalUsd = sumCostUsd(messages)
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0
  const isOver = limit > 0 && used > limit

  const barFill = colorForPct(pct, dark)
  const numberColor = colorForPct(pct, dark, /* boostBelowWarn */ true)

  // "Compact now" surfaces when we're in the warning band AND there's
  // at least one message that hasn't been summarized yet. No minimums —
  // if the user wants to compact, we let them.
  const hasUncompacted = messages.some(
    (m) => m.supersededAt === null && m.summarizedAt === null,
  )
  const showCompactLink = !!onCompactNow && pct >= 60 && hasUncompacted

  return (
    <View className="border-t border-zinc-200 px-3 py-1.5 dark:border-zinc-800">
      {compacting ? (
        <View className="flex-row items-center gap-2">
          <ActivityIndicator size="small" color={dark ? "#a8c98a" : "#5b8a3a"} />
          <Text className="text-[10px] font-medium text-matcha-700 dark:text-matcha-300">
            Compacting…
          </Text>
        </View>
      ) : (
        <>
          <View className="flex-row items-center gap-3">
            <Text
              style={{ color: numberColor }}
              className="text-[10px] tabular-nums"
            >
              {limit > 0
                ? `${formatTokenCount(used)} / ${formatTokenCount(limit)}`
                : `${formatTokenCount(used)} tokens`}
            </Text>
            <View className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
              {limit > 0 && (
                <View
                  style={{ width: `${pct}%`, backgroundColor: barFill }}
                  className="h-full rounded-full"
                />
              )}
            </View>
            <Text className="text-[10px] tabular-nums text-zinc-500 dark:text-zinc-400">
              {totalUsd > 0 ? `~${formatUsd(totalUsd)}` : "—"}
            </Text>
          </View>
          {(pct >= 90 || isOver || showCompactLink) && (
            <View className="mt-1 flex-row items-center justify-between gap-3">
              {pct >= 90 ? (
                <Text className="flex-1 text-[10px] text-red-600 dark:text-red-400">
                  {isOver
                    ? "Over context limit — compact or start a new chat."
                    : "Near context limit — compact or start a new chat."}
                </Text>
              ) : (
                <View className="flex-1" />
              )}
              {showCompactLink && (
                <Pressable onPress={onCompactNow} hitSlop={6}>
                  <Text className="text-[10px] font-medium text-blue-600 dark:text-blue-400">
                    Compact now
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </>
      )}
    </View>
  )
}

function estimateConversationTokens(messages: readonly Message[]): number {
  let total = 0
  for (const m of messages) {
    if (typeof m.promptTokens === "number" && m.role === "assistant") {
      // Real prompt tokens from the API include all prior history at that
      // turn — best ground truth we have. Add the assistant's completion on
      // top.
      total = Math.max(total, m.promptTokens + (m.completionTokens ?? 0))
    } else {
      total += estimateTokens(m.content)
    }
  }
  return total
}

function sumCostUsd(messages: readonly Message[]): number {
  let usd = 0
  for (const m of messages) {
    if (typeof m.costUsd === "number") {
      usd += m.costUsd
    } else if (typeof m.costCents === "number") {
      // Pre-v3 rows only carry cents — fall back so totals don't lose them.
      usd += m.costCents / 100
    }
  }
  return usd
}

function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`
  return `${n}`
}

// ---- color interpolation ----

type RGB = [number, number, number]

const ZINC_LIGHT: RGB = [161, 161, 170] // zinc-400
const ZINC_DARK: RGB = [113, 113, 122] // zinc-500
const AMBER: RGB = [245, 158, 11] // amber-500
const RED: RGB = [239, 68, 68] // red-500

/**
 * Bar/text color as a function of context-window usage. Below 60% it stays
 * neutral; rises smoothly through amber, then red, then clamps at red once
 * over the limit.
 *
 * `boostBelowWarn` makes the small numeric label slightly higher contrast
 * than the bar itself when in the calm zone — the bar can be subtle but
 * the count needs to stay legible.
 */
function colorForPct(pct: number, dark: boolean, boostBelowWarn = false): string {
  const base: RGB = dark ? ZINC_DARK : ZINC_LIGHT
  const calmText: RGB = dark ? [161, 161, 170] : [113, 113, 122]
  if (pct < 60) {
    const c = boostBelowWarn ? calmText : base
    return rgb(c)
  }
  if (pct < 80) return rgb(lerp(base, AMBER, (pct - 60) / 20))
  if (pct < 100) return rgb(lerp(AMBER, RED, (pct - 80) / 20))
  return rgb(RED)
}

function lerp(a: RGB, b: RGB, t: number): RGB {
  const tt = Math.min(1, Math.max(0, t))
  return [
    Math.round(a[0] + (b[0] - a[0]) * tt),
    Math.round(a[1] + (b[1] - a[1]) * tt),
    Math.round(a[2] + (b[2] - a[2]) * tt),
  ]
}

function rgb(c: RGB): string {
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`
}
