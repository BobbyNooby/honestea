import {
  IconChevronDown,
  IconChevronRight,
} from "@tabler/icons-react-native"
import { router } from "expo-router"
import { useState } from "react"
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import {
  curatedModelsByTier,
  curatedTierLabel,
  findCuratedModel,
} from "@honestea/shared"

import { cn } from "@/lib/cn"
import { findModel, useModelRegistry } from "@/lib/model"

import { CuratedRow } from "./curated-row"
import { CustomModelSection } from "./custom-model-row"

interface Props {
  modelId: string
  onChange: (next: string) => void
}

/**
 * Header pill that shows the active model and opens a bottom sheet
 * picker. Mirrors Claude's centered "model" affordance — chat history
 * persists across switches because every provider re-ingests the full
 * message list each turn.
 *
 * Sheet structure (top → bottom):
 *  1. Curated tiers (Flagship → Workhorse → Basic) — `CuratedRow`s
 *     enriched with live registry pricing/context.
 *  2. "From catalog" — only when the active model isn't in the curated
 *     short-list. `CustomModelSection` shows the full registry name and
 *     metadata so the user knows what they picked from /models.
 *  3. "More models" CTA → /models browse page.
 */
export function ModelSelector({ modelId, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const dark = useColorScheme() === "dark"
  const { registry } = useModelRegistry()
  const current = findCuratedModel(modelId)
  // Only fall back to the registry name when the active model isn't in
  // the curated short-list. Keeps the pill compact for normal cases
  // ("Haiku 4.5") and informative for catalog picks ("OpenAI: GPT-5 Pro"
  // beats the raw slug).
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
          {/* Inner Pressable swallows taps so they don't dismiss the sheet.
           *  Cap the sheet height to 85% of the screen so it can't push
           *  the handle bar above the visible area on smaller phones —
           *  the body becomes scrollable instead. */}
          <Pressable
            className="rounded-t-2xl bg-white dark:bg-zinc-950"
            style={{ maxHeight: Dimensions.get("window").height * 0.85 }}
          >
            <View className="mx-auto mb-3 mt-2 h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <SafeAreaView edges={["bottom"]}>
                {curatedModelsByTier().map((group, idx) => (
                  <View key={group.tier}>
                    <Text
                      className={cn(
                        "px-5 pb-1 text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400",
                        idx === 0 ? "pt-1" : "pt-3",
                      )}
                    >
                      {curatedTierLabel(group.tier)}
                    </Text>
                    {group.models.map((m) => (
                      <CuratedRow
                        key={m.id}
                        model={m}
                        registryModel={
                          registry ? findModel(registry, m.id) ?? null : null
                        }
                        selected={m.id === modelId}
                        onPress={() => {
                          onChange(m.id)
                          setOpen(false)
                        }}
                      />
                    ))}
                  </View>
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
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}
