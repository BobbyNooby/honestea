import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native"
import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { useEffect } from "react"
import { ActivityIndicator, Text, View } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { Drawer } from "react-native-drawer-layout"
import "react-native-reanimated"

import { Sidebar } from "@/components/sidebar"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { useRunMigrations } from "@/lib/db"
import { sweepStreamingMessages } from "@/lib/db/repository"
import { ConversationsProvider } from "@/lib/conversations-context"
import { SidebarProvider } from "@/lib/sidebar-context"
import "../global.css"

export const unstable_settings = {
  anchor: "index",
}

export default function RootLayout() {
  const colorScheme = useColorScheme()
  const { success, error } = useRunMigrations()

  // Recover any messages stuck in `streaming` from a prior crashed session.
  useEffect(() => {
    if (success) sweepStreamingMessages().catch(() => {})
  }, [success])

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-8 dark:bg-zinc-950">
        <Text className="text-base text-red-600 dark:text-red-400">
          Failed to initialize local database.
        </Text>
        <Text className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          {error.message}
        </Text>
      </View>
    )
  }

  if (!success) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-zinc-950">
        <ActivityIndicator />
      </View>
    )
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <ConversationsProvider>
          <SidebarProvider
            render={({ isOpen, open, close }) => (
              <Drawer
                open={isOpen}
                onOpen={open}
                onClose={close}
                renderDrawerContent={() => <Sidebar onClose={close} />}
                drawerType="front"
                swipeEdgeWidth={40}
              >
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="settings" options={{ headerShown: true, title: "Settings" }} />
                  <Stack.Screen name="byok" options={{ headerShown: true, title: "API Keys" }} />
                  <Stack.Screen
                    name="modal"
                    options={{ presentation: "modal", title: "Modal" }}
                  />
                </Stack>
              </Drawer>
            )}
          />
          <StatusBar style="auto" />
        </ConversationsProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  )
}
