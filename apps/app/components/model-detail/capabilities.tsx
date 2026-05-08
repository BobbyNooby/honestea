import { Text, View } from "react-native"

import { formatContext, type RegistryModel } from "@/lib/model"

/**
 * Capabilities block on the model detail screen. Two-card grid for
 * context window + max output, then accept/produce modality chips, then
 * tokenizer + moderation notes if the registry surfaced them.
 */
export function CapabilitiesGrid({ model }: { model: RegistryModel }) {
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

/**
 * Inline row of modality chips with a leading label ("Accepts: text image").
 * Distinct from the per-row `ModalityPill` used in the browse list — this
 * one is grouped with a label, while that one is a standalone tag in a
 * dense list.
 */
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
