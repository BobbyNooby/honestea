import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native"
import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { useEffect } from "react"
import { ActivityIndicator, Text, View } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { Drawer } from "react-native-drawer-layout"
import "react-native-reanimated"
import { SafeAreaProvider } from "react-native-safe-area-context"
import Toast from "react-native-toast-message"

import { Sidebar } from "@/components/sidebar"
import { useColorScheme } from "@/hooks/use-color-scheme"
import { ConfirmDialogProvider } from "@/lib/confirm-context"
import { useRunMigrations } from "@/lib/db"
import { sweepStreamingMessages } from "@/lib/db/repository"
import { ConversationsProvider } from "@/lib/conversations-context"
import { SelectedModelProvider } from "@/lib/model"
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
      <SafeAreaProvider>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <SelectedModelProvider>
          <ConversationsProvider>
            <ConfirmDialogProvider>
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
                    <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
                    <Stack.Screen name="api-key-info" options={{ headerShown: false }} />
                    <Stack.Screen name="settings/index" options={{ headerShown: true, title: "Settings" }} />
                    <Stack.Screen name="settings/usage" options={{ headerShown: true, title: "Usage" }} />
                    <Stack.Screen name="byok" options={{ headerShown: false }} />
                    <Stack.Screen name="models/index" options={{ headerShown: true, title: "Models" }} />
                    <Stack.Screen name="models/[id]" options={{ headerShown: true, title: "Model" }} />
                    <Stack.Screen name="model-browser/index" options={{ headerShown: true, title: "Model Browser" }} />
                  </Stack>
                </Drawer>
              )}
            />
            <StatusBar style="auto" />
            </ConfirmDialogProvider>
          </ConversationsProvider>
          </SelectedModelProvider>
        </ThemeProvider>
      </SafeAreaProvider>
      {/* Pure-JS toast — sits as the last child of the root view so it
       * always overlays everything else. */}
      <Toast />
    </GestureHandlerRootView>
  )
}
