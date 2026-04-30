import { router } from "expo-router"
import { Pressable, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { Button } from "@/components/ui/button"

export interface SidebarProps {
  onClose: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  const goToSettings = () => {
    onClose()
    router.push("/(tabs)/settings")
  }

  const newChat = () => {
    // TODO: wire up to clear conversation state once persistence lands.
    onClose()
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-zinc-950" edges={["top", "bottom"]}>
      <View className="flex-1 px-4 py-3">
        <View className="mb-6 flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Honest AI
          </Text>
        </View>

        <Button onPress={newChat} variant="outline" className="mb-6">
          + New chat
        </Button>

        <Text className="mb-2 px-1 text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Recent
        </Text>
        <View className="flex-1 items-center justify-center px-2">
          <Text className="text-center text-sm text-zinc-500 dark:text-zinc-400">
            No conversations yet. Once chat persistence lands, your history
            will appear here.
          </Text>
        </View>

        <View className="border-t border-zinc-200 pt-3 dark:border-zinc-800">
          <Pressable
            onPress={goToSettings}
            className="flex-row items-center justify-between rounded-md px-2 py-3 active:bg-zinc-100 dark:active:bg-zinc-900"
          >
            <Text className="text-base text-zinc-900 dark:text-zinc-100">
              Settings
            </Text>
            <Text className="text-zinc-400 dark:text-zinc-500">›</Text>
          </Pressable>
          <Text className="mt-1 px-2 text-xs text-zinc-400 dark:text-zinc-500">
            v0.0.0
          </Text>
        </View>
      </View>
    </SafeAreaView>
  )
}
