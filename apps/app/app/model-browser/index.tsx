import { IconArrowRight, IconFlame, IconSparkles } from "@tabler/icons-react-native"
import { router, Stack } from "expo-router"
import { useMemo } from "react"
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { TRENDING_MODELS } from "@honestea/shared"

import { ModalityPill, collectModalities } from "@/components/models/modality-pill"
import {
  formatContext,
  formatPricePerMillion,
  pricePartsFromPricing,
  providerFromId,
  useModelRegistry,
  type RegistryModel,
} from "@/lib/model"

/**
 * App-store-style model browser. Lives behind the sidebar "Models" link.
 *
 *  • Hero "Trending" row — horizontal scroll of large cards driven by
 *    the hardcoded `TRENDING_MODELS` slug list. Slugs that don't resolve
 *    in the live registry are silently dropped.
 *  • Category grids — 2-column cards grouped by coarse tier (flagship,
 *    workhorse, basic, open-weight). The grouping is heuristic based on
 *    price + provider + context; it doesn't have to be perfect.
 *  • Footer CTA — "Browse all models" drops into the full `/models` list.
 *
 * This is intentionally visually distinct from the utilitarian `/models`
 * search list — more marketing, more whitespace, bigger type.
 */
export default function ModelBrowserScreen() {
  const dark = useColorScheme() === "dark"
  const { ready, registry } = useModelRegistry()

  const trending = useMemo(() => {
    if (!registry) return []
    const map = new Map(registry.map((m) => [m.id, m]))
    return TRENDING_MODELS.map((id) => map.get(id)).filter(Boolean) as RegistryModel[]
  }, [registry])

  const categories = useMemo(() => {
    if (!registry) return []
    const all = [...registry]
    // Heuristic tier classifier — same logic as Auto Model Selection
    const flagship: RegistryModel[] = []
    const workhorse: RegistryModel[] = []
    const basic: RegistryModel[] = []
    const openWeight: RegistryModel[] = []

    for (const m of all) {
      const { inputUsd } = pricePartsFromPricing(m.pricing)
      const provider = providerFromId(m.id)
      const isOpenWeight =
        provider === "meta-llama" ||
        provider === "alibaba" ||
        provider === "deepseek" ||
        provider === "mistral" ||
        provider === "qwen" ||
        provider === "yi"

      if (isOpenWeight && inputUsd < 0.5) {
        openWeight.push(m)
      } else if (inputUsd > 3) {
        flagship.push(m)
      } else if (inputUsd > 0.3) {
        workhorse.push(m)
      } else {
        basic.push(m)
      }
    }

    // Sort each category by some quality signal — here we use context length desc
    const sortCtx = (a: RegistryModel, b: RegistryModel) =>
      (b.context_length ?? 0) - (a.context_length ?? 0)

    return [
      { key: "flagship", label: "Flagship", tint: "bg-oolong-100 dark:bg-oolong-600/20", models: flagship.sort(sortCtx).slice(0, 6) },
      { key: "workhorse", label: "Workhorse", tint: "bg-matcha-500/10 dark:bg-matcha-400/15", models: workhorse.sort(sortCtx).slice(0, 6) },
      { key: "basic", label: "Fast & Cheap", tint: "bg-zinc-100 dark:bg-zinc-800", models: basic.sort(sortCtx).slice(0, 6) },
      { key: "open", label: "Open Weights", tint: "bg-blue-500/10 dark:bg-blue-400/15", models: openWeight.sort(sortCtx).slice(0, 6) },
    ].filter((c) => c.models.length > 0)
  }, [registry])

  if (!ready) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-chamomile-50 dark:bg-chamomile-900">
        <ActivityIndicator />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView
      className="flex-1 bg-chamomile-50 dark:bg-chamomile-900"
      edges={["bottom"]}
    >
      <Stack.Screen
        options={{
          title: "Model Browser",
          headerStyle: { backgroundColor: "transparent" },
        }}
      />

      <ScrollView
        contentContainerClassName="pb-10"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Trending hero ── */}
        <View className="px-4 pt-4">
          <View className="mb-3 flex-row items-center gap-2">
            <IconFlame size={18} color={dark ? "#facc15" : "#eab308"} strokeWidth={2} />
            <Text className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Trending
            </Text>
          </View>
          <FlatList
            data={trending}
            keyExtractor={(m) => m.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-3 pb-2"
            renderItem={({ item }) => (
              <TrendingCard model={item} />
            )}
            ListEmptyComponent={
              <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                No trending models available.
              </Text>
            }
          />
        </View>

        {/* ── Category grids ── */}
        {categories.map((cat) => (
          <View key={cat.key} className="mt-6 px-4">
            <View className="mb-3 flex-row items-center gap-2">
              <IconSparkles
                size={16}
                color={dark ? "#a1a1aa" : "#71717a"}
                strokeWidth={2}
              />
              <Text className="text-[15px] font-bold text-zinc-900 dark:text-zinc-100">
                {cat.label}
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-3">
              {cat.models.map((m) => (
                <CategoryCard key={m.id} model={m} tint={cat.tint} />
              ))}
            </View>
          </View>
        ))}

        {/* ── Browse all CTA ── */}
        <Pressable
          onPress={() => router.push("/models" as never)}
          className="mx-4 mt-8 flex-row items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white py-3.5 active:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:active:bg-zinc-800"
        >
          <Text className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">
            Browse all models
          </Text>
          <IconArrowRight
            size={16}
            color={dark ? "#a1a1aa" : "#71717a"}
            strokeWidth={2}
          />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

/* ── Trending hero card ── */
function TrendingCard({ model }: { model: RegistryModel }) {
  const dark = useColorScheme() === "dark"
  const provider = providerFromId(model.id)
  const { inputUsd, outputUsd } = pricePartsFromPricing(model.pricing)
  const isFree = inputUsd === 0 && outputUsd === 0
  const modalities = collectModalities(model)

  return (
    <Pressable
      onPress={() =>
        router.push(
          {
            pathname: "/models/[id]",
            params: { id: model.id },
          } as never,
        )
      }
      className="w-[260px] gap-2 rounded-2xl border border-zinc-200 bg-white p-4 active:opacity-90 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <Text
        className="text-[17px] font-bold text-zinc-900 dark:text-zinc-100"
        numberOfLines={1}
      >
        {model.name}
      </Text>
      <Text className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400">
        by {provider}
      </Text>
      {model.description && (
        <Text
          className="text-[13px] leading-[18px] text-zinc-600 dark:text-zinc-300"
          numberOfLines={2}
        >
          {model.description}
        </Text>
      )}
      <View className="mt-1 flex-row flex-wrap gap-1.5">
        {modalities.slice(0, 3).map((m) => (
          <ModalityPill key={m} name={m} />
        ))}
      </View>
      <View className="mt-1 flex-row items-center gap-3">
        {model.context_length > 0 && (
          <Text className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
            {formatContext(model.context_length)} ctx
          </Text>
        )}
        {isFree ? (
          <View className="rounded-full bg-emerald-100 px-2 py-0.5 dark:bg-emerald-900">
            <Text className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              free
            </Text>
          </View>
        ) : (
          <Text className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
            {formatPricePerMillion(inputUsd)}/M
          </Text>
        )}
      </View>
    </Pressable>
  )
}

/* ── Category grid card ── */
function CategoryCard({
  model,
  tint,
}: {
  model: RegistryModel
  tint: string
}) {
  const dark = useColorScheme() === "dark"
  const provider = providerFromId(model.id)
  const { inputUsd, outputUsd } = pricePartsFromPricing(model.pricing)
  const isFree = inputUsd === 0 && outputUsd === 0
  const modalities = collectModalities(model)

  return (
    <Pressable
      onPress={() =>
        router.push(
          {
            pathname: "/models/[id]",
            params: { id: model.id },
          } as never,
        )
      }
      className={`w-[48%] gap-1.5 rounded-xl border border-zinc-200 p-3 active:opacity-90 dark:border-zinc-800 ${tint}`}
    >
      <Text
        className="text-[14px] font-bold text-zinc-900 dark:text-zinc-100"
        numberOfLines={1}
      >
        {model.name}
      </Text>
      <Text className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
        {provider}
      </Text>
      {model.description && (
        <Text
          className="text-[11px] leading-[15px] text-zinc-600 dark:text-zinc-300"
          numberOfLines={2}
        >
          {model.description}
        </Text>
      )}
      <View className="mt-0.5 flex-row flex-wrap gap-1">
        {modalities.slice(0, 2).map((m) => (
          <ModalityPill key={m} name={m} />
        ))}
      </View>
      <View className="mt-1 flex-row items-center gap-2">
        {model.context_length > 0 && (
          <Text className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
            {formatContext(model.context_length)}
          </Text>
        )}
        {isFree ? (
          <Text className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
            FREE
          </Text>
        ) : (
          <Text className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
            {formatPricePerMillion(inputUsd)}/M
          </Text>
        )}
      </View>
    </Pressable>
  )
}
