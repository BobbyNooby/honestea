import { IconKey } from "@tabler/icons-react-native"
import { router } from "expo-router"
import { Text, useColorScheme, View } from "react-native"

import { Button } from "@/components/ui/button"

/**
 * Empty state shown in the chat screen until the user saves at least one
 * BYOK key. Single CTA into the /byok flow.
 */
export function NoKeyState() {
  const dark = useColorScheme() === "dark"
  return (
    <View className="flex-1 items-center justify-center gap-4 px-8">
      <View className="h-14 w-14 items-center justify-center rounded-full bg-matcha-500/10">
        <IconKey
          size={28}
          color={dark ? "#8eb56b" : "#5b8a3a"}
          strokeWidth={1.75}
        />
      </View>
      <View className="gap-2">
        <Text className="text-center text-xl font-bold text-zinc-900 dark:text-zinc-100">
          Add an API key to start chatting
        </Text>
        <Text className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          HonesTea uses your own provider keys. They live encrypted on your
          device — we never see them.
        </Text>
      </View>
      <Button
        onPress={() => router.push("/byok" as never)}
        className="mt-2 min-w-[200px] bg-matcha-600 dark:bg-matcha-400"
      >
        Set up your keys
      </Button>
      <Text className="text-center text-xs text-zinc-500 dark:text-zinc-400">
        Recommended: a single OpenRouter key gives you access to every model.
      </Text>
    </View>
  )
}
