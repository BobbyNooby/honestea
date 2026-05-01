import { IconCheck } from "@tabler/icons-react-native"
import { Pressable, Text, useColorScheme, View } from "react-native"

import { type CuratedModel } from "@honestea/shared"

import { ModalityPill, collectModalities } from "@/components/modality-pill"
import { cn } from "@/lib/cn"
import {
  formatContext,
  formatPricePerMillion,
  pricePartsFromPricing,
  providerFromId,
} from "@/lib/format-model"
import { type RegistryModel } from "@/lib/model-registry"

/**
 * One row in the curated section of the model picker. Pulls live
 * provider, context, and pricing off the OR registry so the prices
 * shown match what the user is actually charged. Selection state drives
 * a subtle blue tint + checkmark.
 */
export function CuratedRow({
  model,
  registryModel,
  selected,
  onPress,
}: {
  model: CuratedModel
  /** Same model resolved against the live OR registry. Provides context,
   *  prompt/completion pricing. Null until the registry hydrates or if
   *  the curated slug isn't in OR's catalog right now. */
  registryModel: RegistryModel | null
  selected: boolean
  onPress: () => void
}) {
  const dark = useColorScheme() === "dark"
  const provider = providerFromId(model.id)
  const prices = registryModel
    ? pricePartsFromPricing(registryModel.pricing)
    : null
  const modalities = registryModel ? collectModalities(registryModel) : []
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "flex-row items-center gap-3 px-5 py-3 active:bg-zinc-100 dark:active:bg-zinc-900",
        selected && "bg-blue-500/5 dark:bg-blue-400/10",
      )}
    >
      <View className="flex-1 gap-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-base font-medium text-zinc-900 dark:text-zinc-100">
            {model.displayName}
          </Text>
          {model.speciality && <SpecialityChip label={model.speciality} />}
        </View>
        {modalities.length > 0 && (
          <View className="flex-row flex-wrap gap-1">
            {modalities.map((m) => (
              <ModalityPill key={m} name={m} />
            ))}
          </View>
        )}
        <Text className="text-xs text-zinc-500 dark:text-zinc-400">
          {model.description}
        </Text>
        <View className="mt-0.5 flex-row flex-wrap gap-x-3 gap-y-0.5">
          <Text className="text-[11px] text-zinc-500 dark:text-zinc-400">
            by {provider}
          </Text>
          {registryModel && registryModel.context_length > 0 && (
            <Text className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {formatContext(registryModel.context_length)} context
            </Text>
          )}
          {prices && (
            <Text className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {formatPricePerMillion(prices.inputUsd)}/M in ·{" "}
              {formatPricePerMillion(prices.outputUsd)}/M out
            </Text>
          )}
        </View>
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
 * Small uppercase pill that tags a within-tier specialization
 * (workhorse · "coding" vs workhorse · "reasoning"). Subtle so it
 * doesn't fight with the model name.
 */
function SpecialityChip({ label }: { label: string }) {
  return (
    <View className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">
      <Text className="text-[10px] font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
        {label}
      </Text>
    </View>
  )
}
