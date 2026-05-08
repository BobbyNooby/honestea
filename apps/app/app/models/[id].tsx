import { Stack, router, useLocalSearchParams } from "expo-router"
import {
  ActivityIndicator,
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
  useModelRegistry,
  useSelectedModel,
} from "@/lib/model"

/**
 * Per-model detail page. Composes blocks from `components/model-detail/*`
 * — header, description, pricing, capabilities, identifiers, footer.
 * Each block is small enough to read in isolation; this screen just
 * orchestrates the registry lookup, error / loading states, and the
 * "Use this model" flow.
 */
export default function ModelDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>()
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  const { ready, registry, error } = useModelRegistry()
  const { setModelId, modelId: currentId } = useSelectedModel()

  const model = registry && id ? findModel(registry, id) : undefined

  const handleSelect = () => {
    if (!model) return
    setModelId(model.id)
    // dismissTo bounces past the browse list straight to chat. router.back()
    // would just pop one frame.
    router.dismissTo("/")
  }

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

      {!ready ? (
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
