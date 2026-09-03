import { Stack, router, useLocalSearchParams } from "expo-router"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { CapabilitiesGrid } from "@/components/model-detail/capabilities"
import { ModelDetailHeader } from "@/components/model-detail/header"
import { Identifiers } from "@/components/model-detail/identifiers"
import { PricingTable } from "@/components/model-detail/pricing"
import { Section } from "@/components/model-detail/section"
import { SelectFooter } from "@/components/model-detail/select-footer"
import {
  findModel,
  loadModelDetail,
  useModelRegistry,
  useSelectedModel,
  type RegistryModel,
} from "@/lib/model"

/**
 * Per-model detail page. Composes blocks from `components/model-detail/*`
 * — header, description, pricing, capabilities, identifiers, footer.
 *
 * Falls back to the individual model cache (`loadModelDetail`) when the
 * bulk registry hasn't loaded yet or the model is missing from it. This
 * lets the detail screen render instantly even on first launch or when
 * offline.
 */
export default function ModelDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>()
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  const { ready, registry, error, isStale, fetchedAt, refresh } =
    useModelRegistry()
  const { setModelId, modelId: currentId } = useSelectedModel()
  const [refreshing, setRefreshing] = useState(false)

  const [cachedModel, setCachedModel] = useState<RegistryModel | null>(null)

  useEffect(() => {
    if (!id) return
    // If the bulk registry already has this model, use it (it's fresher).
    const fromRegistry = registry && findModel(registry, id)
    if (fromRegistry) {
      setCachedModel(fromRegistry)
      return
    }
    // Otherwise try the individual per-model cache.
    loadModelDetail(id).then((res: { model: RegistryModel; fetchedAt: number } | null) => {
      if (res) setCachedModel(res.model)
    })
  }, [id, registry])

  const model = cachedModel ?? undefined

  const handleSelect = () => {
    if (!model) return
    setModelId(model.id)
    router.dismissTo("/" as never)
  }

  const staleText =
    isStale && fetchedAt
      ? `Cached ${Math.round((Date.now() - fetchedAt) / (1000 * 60 * 60 * 24))}d ago`
      : null

  return (
    <SafeAreaView
      className="flex-1 bg-chamomile-50 dark:bg-chamomile-900"
      edges={["bottom"]}
    >
      <Stack.Screen
        options={{
          title: model?.name ?? "Model",
          headerStyle: { backgroundColor: "transparent" },
          headerBackTitle: "Models",
        }}
      />

      {!ready && !cachedModel ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : !model ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-sm text-zinc-500 dark:text-zinc-400">
            {error ?? `No model with id "${id}" in the OpenRouter catalog.`}
          </Text>
        </View>
      ) : (
        <>
          <ScrollView contentContainerClassName="pb-32">
            {staleText && (
              <View className="mx-4 mt-2 flex-row items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5">
                <Text className="text-xs text-amber-700 dark:text-amber-400">
                  🕐 {staleText} — prices and capabilities may be outdated.
                </Text>
                <Pressable
                  onPress={() => {
                    if (refreshing) return
                    setRefreshing(true)
                    refresh()
                      .catch(() => {
                        // Offline — the stale banner stays up.
                      })
                      .finally(() => setRefreshing(false))
                  }}
                  hitSlop={8}
                  disabled={refreshing}
                >
                  <Text className="text-xs font-medium text-amber-800 dark:text-amber-300">
                    {refreshing ? "Refreshing…" : "Refresh"}
                  </Text>
                </Pressable>
              </View>
            )}
            <ModelDetailHeader model={model} />
            <Section title="Description">
              <Text className="text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                {model.description?.trim() || "No description provided."}
              </Text>
            </Section>
            <Section title="Pricing">
              <PricingTable model={model} />
            </Section>
            <Section title="Capabilities">
              <CapabilitiesGrid model={model} />
            </Section>
            <Section title="Identifiers">
              <Identifiers model={model} />
            </Section>
          </ScrollView>

          <SelectFooter
            isSelected={currentId === model.id}
            onSelect={handleSelect}
          />
        </>
      )}
    </SafeAreaView>
  )
}
