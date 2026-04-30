import { router } from "expo-router"
import { Pressable, ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useThemePreference, type ThemePreference } from "@/lib/theme"

export default function SettingsScreen() {
  const [pref, setPref] = useThemePreference()

  return (
    <SafeAreaView
      className="flex-1 bg-chamomile-100 dark:bg-chamomile-900"
      edges={["top", "bottom"]}
    >
      <ScrollView contentContainerClassName="p-5 gap-6">
        <Section title="Appearance">
          <Row
            label="Dark mode"
            description="Use a dark color scheme regardless of system setting."
          >
            <Switch
              value={pref === "dark"}
              onValueChange={(on) => setPref(on ? "dark" : "light")}
            />
          </Row>

          <View className="gap-2 px-1">
            <Text className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Theme
            </Text>
            <View className="flex-row gap-2">
              <ThemeButton current={pref} value="system" onPress={setPref}>
                System
              </ThemeButton>
              <ThemeButton current={pref} value="light" onPress={setPref}>
                Light
              </ThemeButton>
              <ThemeButton current={pref} value="dark" onPress={setPref}>
                Dark
              </ThemeButton>
            </View>
          </View>
        </Section>

        <Section title="API access">
          <Pressable
            onPress={() => router.push("/byok" as never)}
            className="-mx-2 flex-row items-center justify-between rounded-md px-2 py-2 active:bg-zinc-100 dark:active:bg-zinc-900"
          >
            <View className="flex-1 gap-0.5">
              <Text className="text-base text-zinc-900 dark:text-zinc-100">
                Bring your own keys
              </Text>
              <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                Use your OpenRouter key (or direct provider keys) to skip our markup.
              </Text>
            </View>
            <Text className="ml-3 text-zinc-400 dark:text-zinc-500">›</Text>
          </Pressable>
        </Section>

        <Section title="About">
          <Row label="Version" description="Honest AI mobile app">
            <Text className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
              0.0.0
            </Text>
          </Row>
        </Section>
      </ScrollView>
    </SafeAreaView>
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
    <View className="gap-3">
      <Text className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {title}
      </Text>
      <View className="gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        {children}
      </View>
    </View>
  )
}

function Row({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children?: React.ReactNode
}) {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <View className="flex-1 gap-0.5">
        <Text className="text-base text-zinc-900 dark:text-zinc-100">{label}</Text>
        {description && (
          <Text className="text-xs text-zinc-500 dark:text-zinc-400">
            {description}
          </Text>
        )}
      </View>
      {children}
    </View>
  )
}

function ThemeButton({
  current,
  value,
  onPress,
  children,
}: {
  current: ThemePreference
  value: ThemePreference
  onPress: (next: ThemePreference) => void
  children: React.ReactNode
}) {
  const active = current === value
  return (
    <Button
      variant={active ? "default" : "outline"}
      size="sm"
      className="flex-1"
      onPress={() => onPress(value)}
    >
      {children}
    </Button>
  )
}
