import { IconCheck } from "@tabler/icons-react-native"
import { Text, useColorScheme, View } from "react-native"

import {
  formatContext,
  formatPricePerMillion,
  pricePartsFromPricing,
} from "@/lib/format-model"
import { type RegistryModel } from "@/lib/model-registry"

/**
 * Section shown between the curated tiers and the "More models" CTA when
 * the active model was picked from the full catalog (not curated). Uses
 * the registry's readable `name` field — not the raw slug — so the user
 * sees "OpenAI: GPT-5 Pro" rather than "openai/gpt-5-pro". Tapping this
 * row would be a no-op (the model is already selected); rendered as a
 * non-interactive View instead of a Pressable.
 */
export function CustomModelSection({
  model,
  modelId,
}: {
  model: RegistryModel
  modelId: string
}) {
  const dark = useColorScheme() === "dark"
  const { inputUsd, outputUsd } = pricePartsFromPricing(model.pricing)
  const isFree = inputUsd === 0 && outputUsd === 0
  return (
    <View className="border-t border-zinc-200 dark:border-zinc-800">
      <Text className="px-5 pb-1 pt-3 text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
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
