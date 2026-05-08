import { Text, View } from "react-native"

import { formatCreated, providerFromId, type RegistryModel } from "@/lib/model"

/**
 * Title block at the top of the model detail screen — model name plus
 * a meta line with provider, date added (from OR's `created`), and
 * knowledge cutoff if the registry exposes one.
 */
export function ModelDetailHeader({ model }: { model: RegistryModel }) {
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
