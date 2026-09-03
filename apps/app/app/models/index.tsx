import { IconSearch, IconX } from "@tabler/icons-react-native"
import { Stack } from "expo-router"
import { useDeferredValue, useMemo, useState } from "react"
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

import { ModelListRow } from "@/components/models/model-list-row"
import { useModelRegistry } from "@/lib/model"

/**
 * Browse the full OpenRouter catalog. Search by name/slug/description;
 * tap a row to see the detail view at `/models/[id]`. Selecting a model
 * from the detail screen drops the user back into chat with that model
 * active. Lives behind the "More models" CTA in the curated picker
 * bottom sheet.
 *
 * Row rendering lives in `<ModelListRow>` and the modality pill in
 * `<ModalityPill>` — split out so this screen stays focused on the
 * search / list orchestration.
 */
export default function ModelsBrowseScreen() {
  const dark = useColorScheme() === "dark"
  const { ready, registry, error } = useModelRegistry()
  const [query, setQuery] = useState("")
  // Defer the actual filter pass — keystrokes stay snappy while the
  // 330-model filter runs on the trailing edge. Sorting is hoisted into
  // its own memo so it isn't redone per keystroke.
  const deferredQuery = useDeferredValue(query)

  const sorted = useMemo(() => {
    if (!registry) return []
    return [...registry].sort((a, b) => (b.created ?? 0) - (a.created ?? 0))
  }, [registry])

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter(
      (m) =>
        m.id.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        (m.description?.toLowerCase().includes(q) ?? false),
    )
  }, [sorted, deferredQuery])

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
                No models match “{query}”.
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
