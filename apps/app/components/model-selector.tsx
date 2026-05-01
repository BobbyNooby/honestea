import {
  IconCheck,
  IconChevronDown,
  IconChevronRight,
} from "@tabler/icons-react-native"
import { router } from "expo-router"
import { useState } from "react"
import { Modal, Pressable, Text, useColorScheme, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import {
  CURATED_MODELS,
  findCuratedModel,
  pricePerMillionFromPerToken,
  type CuratedModel,
} from "@honestea/shared"

import { cn } from "@/lib/cn"
import { findModel, useModelRegistry, type RegistryModel } from "@/lib/model-registry"

interface Props {
  modelId: string
  onChange: (next: string) => void
}

/**
 * Header pill that shows the active model and opens a bottom sheet of
 * curated alternatives. Mirrors Claude's centered "model" affordance — chat
 * history persists across switches because every provider re-ingests the
 * full message list each turn.
 */
export function ModelSelector({ modelId, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const dark = useColorScheme() === "dark"
  const { registry } = useModelRegistry()
  const current = findCuratedModel(modelId)
  // Only fall back to the registry name when the active model isn't in the
  // curated short-list. Keeps the pill compact for normal cases ("Haiku 4.5")
  // and informative for catalog picks ("OpenAI: GPT-5 Pro" beats the raw slug).
  const customRegistryModel =
    !current && registry ? findModel(registry, modelId) : null
  const label =
    current?.shortName ?? customRegistryModel?.name ?? modelId

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={6}
        accessibilityLabel="Change model"
        className="max-w-[60%] flex-row items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1.5 active:bg-zinc-100 dark:border-zinc-800 dark:active:bg-zinc-900"
      >
        <Text
          numberOfLines={1}
          className="shrink text-sm font-medium text-zinc-900 dark:text-zinc-100"
        >
          {label}
        </Text>
        <IconChevronDown
          size={14}
          color={dark ? "#a1a1aa" : "#71717a"}
          strokeWidth={2}
        />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          onPress={() => setOpen(false)}
          className="flex-1 justify-end bg-black/40"
        >
          {/* Inner Pressable swallows taps so they don't dismiss the sheet. */}
          <Pressable className="rounded-t-2xl bg-white dark:bg-zinc-950">
            <SafeAreaView edges={["bottom"]}>
              <View className="mx-auto mb-3 mt-2 h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              <Text className="px-5 pb-2 text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Choose a model
              </Text>
              {CURATED_MODELS.map((m) => (
                <ModelRow
                  key={m.id}
                  model={m}
                  selected={m.id === modelId}
                  onPress={() => {
                    onChange(m.id)
                    setOpen(false)
                  }}
                />
              ))}
              {customRegistryModel && (
                <CustomModelSection
                  model={customRegistryModel}
                  modelId={modelId}
                />
              )}
              <Pressable
                onPress={() => {
                  setOpen(false)
                  router.push("/models" as never)
                }}
                className="flex-row items-center gap-3 border-t border-zinc-200 px-5 py-3 active:bg-zinc-100 dark:border-zinc-800 dark:active:bg-zinc-900"
              >
                <View className="flex-1 gap-0.5">
                  <Text className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                    More models
                  </Text>
                  <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                    Browse the full OpenRouter catalog — pricing, context, modalities.
                  </Text>
                </View>
                <IconChevronRight
                  size={18}
                  color={dark ? "#a1a1aa" : "#71717a"}
                  strokeWidth={2}
                />
              </Pressable>
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

function ModelRow({
  model,
  selected,
  onPress,
}: {
  model: CuratedModel
  selected: boolean
  onPress: () => void
}) {
  const dark = useColorScheme() === "dark"
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "flex-row items-center gap-3 px-5 py-3 active:bg-zinc-100 dark:active:bg-zinc-900",
        selected && "bg-blue-500/5 dark:bg-blue-400/10",
      )}
    >
      <View className="flex-1 gap-0.5">
        <Text className="text-base font-medium text-zinc-900 dark:text-zinc-100">
          {model.displayName}
        </Text>
        <Text className="text-xs text-zinc-500 dark:text-zinc-400">
          {model.description}
        </Text>
      </View>
      {selected && (
        <IconCheck
          size={20}
          color={dark ? "#60a5fa" : "#3b82f6"}
          strokeWidth={2.5}
        />
      )}
    </Pressable>
  )
}

/**
 * Section shown between the curated list and the "More models" CTA when
 * the active model was picked from the full catalog (not curated). Uses
 * the registry's readable `name` field — not the raw slug — so the user
 * sees "OpenAI: GPT-5 Pro" rather than "openai/gpt-5-pro". Tapping the
 * row is a no-op since the model is already selected.
 */
function CustomModelSection({
  model,
  modelId,
}: {
  model: RegistryModel
  modelId: string
}) {
  const dark = useColorScheme() === "dark"
  const inputUsd = pricePerMillionFromPerToken(model.pricing.prompt)
  const outputUsd = pricePerMillionFromPerToken(model.pricing.completion)
  const isFree = inputUsd === 0 && outputUsd === 0
  return (
    <View className="border-t border-zinc-200 dark:border-zinc-800">
      <Text className="px-5 pt-3 pb-1 text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        From catalog
      </Text>
      <View className="flex-row items-center gap-3 bg-blue-500/5 px-5 py-3 dark:bg-blue-400/10">
        <View className="flex-1 gap-1">
          <Text
            className="text-base font-medium text-zinc-900 dark:text-zinc-100"
            numberOfLines={2}
          >
            {model.name}
          </Text>
          {model.description && (
            <Text
              className="text-xs text-zinc-500 dark:text-zinc-400"
              numberOfLines={2}
            >
              {model.description}
            </Text>
          )}
          <View className="mt-0.5 flex-row flex-wrap gap-x-3 gap-y-0.5">
            <Text className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {modelId}
            </Text>
            {model.context_length > 0 && (
              <Text className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {formatContext(model.context_length)} context
              </Text>
            )}
            {!isFree ? (
              <>
                <Text className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {formatPricePerMillion(inputUsd)}/M in
                </Text>
                <Text className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {formatPricePerMillion(outputUsd)}/M out
                </Text>
              </>
            ) : (
              <Text className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                free
              </Text>
            )}
          </View>
        </View>
        <IconCheck
          size={20}
          color={dark ? "#60a5fa" : "#3b82f6"}
          strokeWidth={2.5}
        />
      </View>
    </View>
  )
}

function formatContext(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`
  return String(n)
}

function formatPricePerMillion(usd: number): string {
  if (usd === 0) return "$0"
  if (usd < 0.01) return `$${usd.toFixed(4).replace(/\.?0+$/, "")}`
  if (usd < 1) return `$${usd.toFixed(3).replace(/\.?0+$/, "")}`
  if (usd < 10) return `$${usd.toFixed(2)}`
  return `$${Math.round(usd)}`
}
