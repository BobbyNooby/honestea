import { Text, View } from "react-native"

import { estimateTokens, formatUsd, type Message } from "@honestea/shared"

import { cn } from "@/lib/cn"
import { findModel, type RegistryModel } from "@/lib/model-registry"

interface Props {
  messages: readonly Message[]
  modelId: string
  registry: readonly RegistryModel[] | null
}

/**
 * Slim status row above the composer: context-window usage on the left,
 * trailing conversation cost on the right. Recomputes against the
 * currently selected model's context limit, so switching models
 * mid-conversation immediately reflects the new ceiling.
 */
export function ChatStatusRow({ messages, modelId, registry }: Props) {
  const model = registry ? findModel(registry, modelId) : null
  const limit = model?.context_length ?? 0

  // Use the visible (non-superseded) messages for context-window math —
  // those are what'll actually get sent in the next request. But include
  // ALL messages in the cost roll-up so regenerated turns still count.
  const visible = messages.filter((m) => m.supersededAt === null)
  const used = estimateConversationTokens(visible)
  const totalUsd = sumCostUsd(messages)
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0

  const tone = pct >= 90 ? "danger" : pct >= 75 ? "warn" : "neutral"

  return (
    <View className="border-t border-zinc-200 px-3 py-1.5 dark:border-zinc-800">
      <View className="flex-row items-center gap-3">
        <Text
          className={cn(
            "text-[10px] tabular-nums",
            tone === "danger"
              ? "text-red-600 dark:text-red-400"
              : tone === "warn"
                ? "text-amber-600 dark:text-amber-400"
                : "text-zinc-500 dark:text-zinc-400",
          )}
        >
          {limit > 0
            ? `${formatTokenCount(used)} / ${formatTokenCount(limit)}`
            : `${formatTokenCount(used)} tokens`}
        </Text>
        <View className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          {limit > 0 && (
            <View
              style={{ width: `${pct}%` }}
              className={cn(
                "h-full rounded-full",
                tone === "danger"
                  ? "bg-red-500"
                  : tone === "warn"
                    ? "bg-amber-500"
                    : "bg-zinc-400 dark:bg-zinc-600",
              )}
            />
          )}
        </View>
        <Text className="text-[10px] tabular-nums text-zinc-500 dark:text-zinc-400">
          {totalUsd > 0 ? `~${formatUsd(totalUsd)}` : "—"}
        </Text>
      </View>
      {tone === "danger" && (
        <Text className="mt-1 text-[10px] text-red-600 dark:text-red-400">
          Near context limit — start a new chat soon to avoid truncation.
        </Text>
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
