import { Text, View } from "react-native"

/**
 * Reusable section wrapper for the model detail screen — bordered top
 * separator + uppercase tracking-wider title above its children. Used
 * for Description, Pricing, Capabilities, Identifiers.
 */
export function Section({
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
