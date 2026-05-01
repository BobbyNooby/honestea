import { Text, View } from "react-native"

import { type RegistryModel } from "@/lib/model-registry"

/**
 * Identifiers block on the model detail screen. Always renders the OR
 * slug; canonical_slug + hugging_face_id render conditionally. All ids
 * use a monospace font for selectability/copy clarity.
 */
export function Identifiers({ model }: { model: RegistryModel }) {
  return (
    <>
      <IdRow label="OpenRouter slug" value={model.id} />
      {model.canonical_slug && model.canonical_slug !== model.id && (
        <IdRow label="Canonical slug" value={model.canonical_slug} />
      )}
      {model.hugging_face_id && (
        <IdRow label="Hugging Face" value={model.hugging_face_id} />
      )}
    </>
  )
}

function IdRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-baseline gap-2 py-0.5">
      <Text className="text-xs text-zinc-500 dark:text-zinc-400">{label}:</Text>
      <Text className="flex-1 font-mono text-xs text-zinc-700 dark:text-zinc-300">
        {value}
      </Text>
    </View>
  )
}
