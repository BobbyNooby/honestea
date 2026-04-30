import { IconCheck, IconChevronDown } from "@tabler/icons-react-native"
import { useState } from "react"
import { Modal, Pressable, Text, useColorScheme, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import {
  CURATED_MODELS,
  findCuratedModel,
  type CuratedModel,
} from "@honestea/shared"

import { cn } from "@/lib/cn"

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
  const current = findCuratedModel(modelId)
  const label = current?.shortName ?? modelId

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={6}
        accessibilityLabel="Change model"
        className="flex-row items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1.5 active:bg-zinc-100 dark:border-zinc-800 dark:active:bg-zinc-900"
      >
        <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
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
              <Text className="px-5 pt-3 pb-1 text-[11px] text-zinc-400 dark:text-zinc-500">
                More models, filters, and benchmark comparisons coming soon.
              </Text>
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
