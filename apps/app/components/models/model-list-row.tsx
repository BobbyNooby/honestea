import { IconChevronRight } from "@tabler/icons-react-native"
import { router } from "expo-router"
import { Pressable, Text, useColorScheme, View } from "react-native"

import {
  formatContext,
  formatPricePerMillion,
  pricePartsFromPricing,
  providerFromId,
} from "@/lib/format-model"
import { type RegistryModel } from "@/lib/model-registry"

import { ModalityPill, collectModalities } from "./modality-pill"

/**
 * One row in the /models browse list. Tap navigates to /models/[id] for
 * the full detail view. Layout: name + free badge → modality pills →
 * description → meta line (provider · context · pricing).
 */
export function ModelListRow({ model }: { model: RegistryModel }) {
  const dark = useColorScheme() === "dark"
  const provider = providerFromId(model.id)
  const { inputUsd, outputUsd } = pricePartsFromPricing(model.pricing)
  const isFree = inputUsd === 0 && outputUsd === 0
  const modalities = collectModalities(model)
  return (
    <Pressable
      onPress={() =>
        router.push(
          // expo-router's typed-routes table doesn't pick up new routes
          // until the dev server regenerates .expo/types/router.d.ts.
          // Cast keeps typecheck happy on a clean checkout.
          {
            pathname: "/models/[id]",
            params: { id: model.id },
          } as never,
        )
      }
      className="flex-row items-center gap-3 px-5 py-3.5 active:bg-zinc-100 dark:active:bg-zinc-900"
    >
      <View className="flex-1 gap-1">
        <View className="flex-row items-center gap-2">
          <Text
            className="flex-1 text-[15px] font-semibold text-zinc-900 dark:text-zinc-100"
            numberOfLines={1}
          >
            {model.name}
          </Text>
          {isFree && (
            <View className="rounded-full bg-emerald-100 px-2 py-0.5 dark:bg-emerald-900">
              <Text className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                free
              </Text>
            </View>
          )}
        </View>
        {modalities.length > 0 && (
          <View className="flex-row flex-wrap gap-1">
            {modalities.map((m) => (
              <ModalityPill key={m} name={m} />
            ))}
          </View>
        )}
        {model.description && (
          <Text
            className="text-xs text-zinc-500 dark:text-zinc-400"
            numberOfLines={2}
          >
            {model.description}
          </Text>
        )}
        <View className="mt-0.5 flex-row flex-wrap items-center gap-x-3 gap-y-0.5">
          <Text className="text-[11px] text-zinc-500 dark:text-zinc-400">
            by {provider}
          </Text>
          {model.context_length > 0 && (
            <Text className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {formatContext(model.context_length)} context
            </Text>
          )}
          {!isFree && (
            <>
              <Text className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {formatPricePerMillion(inputUsd)}/M input
              </Text>
              <Text className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {formatPricePerMillion(outputUsd)}/M output
              </Text>
            </>
          )}
        </View>
      </View>
      <IconChevronRight
        size={16}
        color={dark ? "#52525b" : "#a1a1aa"}
        strokeWidth={2}
      />
    </Pressable>
  )
}
