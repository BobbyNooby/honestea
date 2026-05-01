import {
  IconChevronRight,
  IconSearch,
  IconX,
} from "@tabler/icons-react-native"
import { Stack, router } from "expo-router"
import { useMemo, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { pricePerMillionFromPerToken } from "@honestea/shared"

import { useModelRegistry, type RegistryModel } from "@/lib/model-registry"

/**
 * Browse the full OpenRouter catalog. Search by name/slug; tap a row to
 * see the detail view. Selecting a model from the detail screen drops the
 * user back into chat with that model active. Lives behind the "More
 * models" CTA in the curated picker bottom sheet.
 */
export default function ModelsBrowseScreen() {
  const dark = useColorScheme() === "dark"
  const { ready, registry, error } = useModelRegistry()
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    if (!registry) return []
    const q = query.trim().toLowerCase()
    const sorted = [...registry].sort(
      (a, b) => (b.created ?? 0) - (a.created ?? 0),
    )
    if (!q) return sorted
    return sorted.filter(
      (m) =>
        m.id.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        (m.description?.toLowerCase().includes(q) ?? false),
    )
  }, [registry, query])

  return (
    <SafeAreaView
      className="flex-1 bg-chamomile-50 dark:bg-chamomile-900"
      edges={["bottom"]}
    >
      <Stack.Screen
        options={{
          title: "Models",
          headerStyle: { backgroundColor: "transparent" },
        }}
      />

      <View className="border-b border-zinc-200 bg-chamomile-50 px-3 py-2 dark:border-zinc-800 dark:bg-chamomile-900">
        <View className="flex-row items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 dark:border-zinc-800 dark:bg-zinc-900">
          <IconSearch
            size={16}
            color={dark ? "#a1a1aa" : "#71717a"}
            strokeWidth={2}
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search models, providers, descriptions…"
            placeholderTextColor={dark ? "#71717a" : "#a1a1aa"}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            className="flex-1 text-[15px] text-zinc-900 dark:text-zinc-100"
            style={{ paddingVertical: 0 }}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <IconX
                size={16}
                color={dark ? "#a1a1aa" : "#71717a"}
                strokeWidth={2}
              />
            </Pressable>
          )}
        </View>
      </View>

      {!ready ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : error && !registry ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-sm text-red-600 dark:text-red-400">
            Failed to load model catalog: {error}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <ModelListRow model={item} />}
          contentContainerClassName="pb-8"
          ItemSeparatorComponent={() => (
            <View className="h-px bg-zinc-200 dark:bg-zinc-800" />
          )}
          ListEmptyComponent={
            <View className="px-6 py-16">
              <Text className="text-center text-sm text-zinc-500 dark:text-zinc-400">
                No models match "{query}".
              </Text>
            </View>
          }
          ListHeaderComponent={
            <Text className="px-5 pb-2 pt-3 text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {filtered.length} models · sorted by newest
            </Text>
          }
        />
      )}
    </SafeAreaView>
  )
}

function ModelListRow({ model }: { model: RegistryModel }) {
  const dark = useColorScheme() === "dark"
  const provider = providerFromId(model.id)
  const inputUsd = pricePerMillionFromPerToken(model.pricing.prompt)
  const outputUsd = pricePerMillionFromPerToken(model.pricing.completion)
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

/**
 * Pill that tags one supported modality (text / image / audio / file /
 * video / embeddings / etc.). Color-coded so multimodal models stand out
 * — text gets neutral zinc, the rest get accent tints.
 */
function ModalityPill({ name }: { name: string }) {
  const tone = MODALITY_TONES[name] ?? MODALITY_TONES.default
  return (
    <View className={`rounded-full px-2 py-0.5 ${tone.bg}`}>
      <Text className={`text-[10px] font-medium ${tone.text}`}>{name}</Text>
    </View>
  )
}

const MODALITY_TONES: Record<string, { bg: string; text: string }> = {
  text: {
    bg: "bg-zinc-100 dark:bg-zinc-800",
    text: "text-zinc-600 dark:text-zinc-300",
  },
  image: {
    bg: "bg-matcha-500/15 dark:bg-matcha-400/20",
    text: "text-matcha-700 dark:text-matcha-300",
  },
  audio: {
    bg: "bg-oolong-500/15 dark:bg-oolong-400/20",
    text: "text-oolong-700 dark:text-oolong-300",
  },
  video: {
    bg: "bg-purple-500/15 dark:bg-purple-400/20",
    text: "text-purple-700 dark:text-purple-300",
  },
  file: {
    bg: "bg-blue-500/15 dark:bg-blue-400/20",
    text: "text-blue-700 dark:text-blue-300",
  },
  embeddings: {
    bg: "bg-amber-500/15 dark:bg-amber-400/20",
    text: "text-amber-700 dark:text-amber-300",
  },
  default: {
    bg: "bg-zinc-100 dark:bg-zinc-800",
    text: "text-zinc-600 dark:text-zinc-300",
  },
}

/**
 * Union of input + output modalities for a model, deduped, with text first
 * (it's the baseline) and other modalities sorted alphabetically. Returns
 * empty if the registry didn't expose modality info — caller hides the row.
 */
function collectModalities(model: RegistryModel): string[] {
  const set = new Set<string>()
  for (const m of model.architecture?.input_modalities ?? []) set.add(m)
  for (const m of model.architecture?.output_modalities ?? []) set.add(m)
  if (set.size === 0) return []
  const arr = [...set]
  arr.sort((a, b) => {
    if (a === "text") return -1
    if (b === "text") return 1
    return a.localeCompare(b)
  })
  return arr
}

function providerFromId(id: string): string {
  const slash = id.indexOf("/")
  return slash === -1 ? id : id.slice(0, slash)
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
