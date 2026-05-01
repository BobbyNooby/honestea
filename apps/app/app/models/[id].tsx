import { Stack, router, useLocalSearchParams } from "expo-router"
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { pricePerMillionFromPerToken } from "@honestea/shared"

import { Button } from "@/components/ui/button"
import { useSelectedModel } from "@/lib/selected-model"
import {
  findModel,
  useModelRegistry,
  type RegistryModel,
} from "@/lib/model-registry"

/**
 * Per-model detail page. Shows everything OpenRouter exposes about the
 * model — full description, pricing rows, modalities, context window,
 * created date, knowledge cutoff. The bottom CTA flips this model into
 * the active selection and bounces back to chat.
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
            <Header model={model} />
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
              <IdRow label="OpenRouter slug" value={model.id} mono />
              {model.canonical_slug && model.canonical_slug !== model.id && (
                <IdRow
                  label="Canonical slug"
                  value={model.canonical_slug}
                  mono
                />
              )}
              {model.hugging_face_id && (
                <IdRow
                  label="Hugging Face"
                  value={model.hugging_face_id}
                  mono
                />
              )}
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

function Header({ model }: { model: RegistryModel }) {
  const provider = providerFromId(model.id)
  const created = formatCreated(model.created)
  return (
    <View className="gap-2 px-5 pb-4 pt-3">
      <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        {model.name}
      </Text>
      <View className="flex-row flex-wrap gap-x-3 gap-y-0.5">
        <Text className="text-xs text-zinc-500 dark:text-zinc-400">
          by {provider}
        </Text>
        {created && (
          <Text className="text-xs text-zinc-500 dark:text-zinc-400">
            added {created}
          </Text>
        )}
        {model.knowledge_cutoff && (
          <Text className="text-xs text-zinc-500 dark:text-zinc-400">
            knowledge through {model.knowledge_cutoff}
          </Text>
        )}
      </View>
    </View>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <View className="gap-2 border-t border-zinc-200 px-5 pb-4 pt-4 dark:border-zinc-800">
      <Text className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {title}
      </Text>
      {children}
    </View>
  )
}

interface PriceRow {
  label: string
  value: number
  unit: string
}

function PricingTable({ model }: { model: RegistryModel }) {
  const promptUsd = pricePerMillionFromPerToken(model.pricing.prompt)
  const completionUsd = pricePerMillionFromPerToken(model.pricing.completion)
  const cacheReadUsd = model.pricing.input_cache_read
    ? pricePerMillionFromPerToken(model.pricing.input_cache_read)
    : null
  const cacheWriteUsd = model.pricing.input_cache_write
    ? pricePerMillionFromPerToken(model.pricing.input_cache_write)
    : null
  const imageInUsd = model.pricing.image
    ? pricePerMillionFromPerToken(model.pricing.image)
    : null
  const imageOutUsd = model.pricing.image_output
    ? pricePerMillionFromPerToken(model.pricing.image_output)
    : null
  const audioInUsd = model.pricing.audio
    ? pricePerMillionFromPerToken(model.pricing.audio)
    : null
  const reasoningUsd = model.pricing.internal_reasoning
    ? pricePerMillionFromPerToken(model.pricing.internal_reasoning)
    : null
  const requestUsd = model.pricing.request
    ? Number.parseFloat(model.pricing.request)
    : null

  const tokenRows: PriceRow[] = [
    { label: "Input tokens", value: promptUsd, unit: "/M" },
    { label: "Output tokens", value: completionUsd, unit: "/M" },
  ]
  if (cacheReadUsd != null && cacheReadUsd !== promptUsd)
    tokenRows.push({ label: "Cache read", value: cacheReadUsd, unit: "/M" })
  if (cacheWriteUsd != null)
    tokenRows.push({ label: "Cache write", value: cacheWriteUsd, unit: "/M" })
  if (reasoningUsd != null && reasoningUsd !== completionUsd)
    tokenRows.push({
      label: "Internal reasoning",
      value: reasoningUsd,
      unit: "/M",
    })
  if (imageInUsd != null)
    tokenRows.push({ label: "Image input", value: imageInUsd, unit: "/M" })
  if (imageOutUsd != null)
    tokenRows.push({ label: "Image output", value: imageOutUsd, unit: "/M" })
  if (audioInUsd != null)
    tokenRows.push({ label: "Audio input", value: audioInUsd, unit: "/M" })

  const isFree = promptUsd === 0 && completionUsd === 0

  return (
    <View className="gap-1 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      {isFree && (
        <View className="mb-2 self-start rounded-full bg-emerald-100 px-2 py-0.5 dark:bg-emerald-900">
          <Text className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            free model
          </Text>
        </View>
      )}
      {tokenRows.map((row) => (
        <PriceLine key={row.label} {...row} />
      ))}
      {requestUsd != null && requestUsd > 0 && (
        <PriceLine label="Per request" value={requestUsd} unit="" raw />
      )}
    </View>
  )
}

function PriceLine({
  label,
  value,
  unit,
  raw,
}: PriceRow & { raw?: boolean }) {
  return (
    <View className="flex-row items-center justify-between py-1">
      <Text className="text-[13px] text-zinc-600 dark:text-zinc-400">
        {label}
      </Text>
      <Text className="text-[13px] font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
        {raw ? formatRawUsd(value) : formatPricePerMillion(value)}
        {unit && (
          <Text className="text-zinc-500 dark:text-zinc-400">{unit}</Text>
        )}
      </Text>
    </View>
  )
}

function CapabilitiesGrid({ model }: { model: RegistryModel }) {
  const inputs = model.architecture?.input_modalities ?? []
  const outputs = model.architecture?.output_modalities ?? []
  return (
    <View className="gap-3">
      <View className="flex-row gap-3">
        <CapabilityCard
          label="Context window"
          value={
            model.context_length > 0
              ? `${formatContext(model.context_length)} tokens`
              : "—"
          }
        />
        <CapabilityCard
          label="Max output"
          value={
            model.top_provider?.max_completion_tokens
              ? `${formatContext(
                  model.top_provider.max_completion_tokens,
                )} tokens`
              : "—"
          }
        />
      </View>
      {inputs.length > 0 && (
        <ModalitiesRow label="Accepts" items={inputs} />
      )}
      {outputs.length > 0 && (
        <ModalitiesRow label="Produces" items={outputs} />
      )}
      {model.architecture?.tokenizer && (
        <Text className="text-xs text-zinc-500 dark:text-zinc-400">
          Tokenizer: {model.architecture.tokenizer}
        </Text>
      )}
      {model.top_provider?.is_moderated != null && (
        <Text className="text-xs text-zinc-500 dark:text-zinc-400">
          {model.top_provider.is_moderated
            ? "Top provider applies content moderation."
            : "Top provider does not apply additional moderation."}
        </Text>
      )}
    </View>
  )
}

function CapabilityCard({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <Text className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {label}
      </Text>
      <Text className="mt-1 text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">
        {value}
      </Text>
    </View>
  )
}

function ModalitiesRow({
  label,
  items,
}: {
  label: string
  items: readonly string[]
}) {
  return (
    <View className="flex-row flex-wrap items-center gap-2">
      <Text className="text-xs text-zinc-500 dark:text-zinc-400">{label}</Text>
      {items.map((m) => (
        <View
          key={m}
          className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800"
        >
          <Text className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
            {m}
          </Text>
        </View>
      ))}
    </View>
  )
}

function IdRow({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <View className="flex-row items-baseline gap-2 py-0.5">
      <Text className="text-xs text-zinc-500 dark:text-zinc-400">{label}:</Text>
      <Text
        className={
          mono
            ? "flex-1 font-mono text-xs text-zinc-700 dark:text-zinc-300"
            : "flex-1 text-xs text-zinc-700 dark:text-zinc-300"
        }
      >
        {value}
      </Text>
    </View>
  )
}

function SelectFooter({
  isSelected,
  onSelect,
}: {
  isSelected: boolean
  onSelect: () => void
}) {
  const dark = useColorScheme() === "dark"
  return (
    <View
      className="absolute bottom-0 left-0 right-0 border-t border-zinc-200 bg-chamomile-50 px-5 pb-6 pt-3 dark:border-zinc-800 dark:bg-chamomile-900"
      style={{ shadowColor: dark ? "#000" : "#999", shadowOpacity: 0.1, shadowRadius: 8 }}
    >
      <SafeAreaView edges={["bottom"]}>
        {isSelected ? (
          <Pressable
            disabled
            className="h-12 items-center justify-center rounded-full border border-matcha-500 bg-matcha-500/10"
          >
            <Text className="text-[15px] font-semibold text-matcha-700 dark:text-matcha-300">
              Currently selected
            </Text>
          </Pressable>
        ) : (
          <Button
            onPress={onSelect}
            className="h-12 rounded-full bg-matcha-600 dark:bg-matcha-400"
            textClassName="text-[15px]"
          >
            Use this model
          </Button>
        )}
      </SafeAreaView>
    </View>
  )
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

function formatRawUsd(n: number): string {
  if (n < 0.01) return `$${n.toFixed(4).replace(/\.?0+$/, "")}`
  if (n < 1) return `$${n.toFixed(3).replace(/\.?0+$/, "")}`
  return `$${n.toFixed(2)}`
}

function formatCreated(unix?: number): string | null {
  if (!unix) return null
  const d = new Date(unix * 1000)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}
