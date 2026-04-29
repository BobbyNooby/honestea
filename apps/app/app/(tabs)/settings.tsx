import { ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { ThemedText } from "@/components/themed-text"
import { useThemePreference, type ThemePreference } from "@/lib/theme"
import { cn } from "@/lib/cn"

export default function SettingsScreen() {
  const [pref, setPref] = useThemePreference()

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView contentContainerClassName="p-5 gap-6">
        <View className="gap-1">
          <ThemedText type="title">Settings</ThemedText>
          <ThemedText className="text-sm opacity-55">
            Configure your chat experience.
          </ThemedText>
        </View>

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
            <ThemedText className="text-xs uppercase tracking-wider opacity-55">
              Theme
            </ThemedText>
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

        <Section title="Model">
          <Row
            label="Default model"
            description="The model used for new conversations."
          >
            <ThemedText className="font-mono text-xs opacity-70">
              minimax/minimax-m2.5
            </ThemedText>
          </Row>
        </Section>

        <Section title="About">
          <Row label="Version" description="Honest AI mobile app">
            <ThemedText className="font-mono text-xs opacity-70">0.0.0</ThemedText>
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
      <ThemedText className="text-xs uppercase tracking-wider opacity-55">
        {title}
      </ThemedText>
      <View className="gap-3 rounded-lg border border-border bg-card p-4">
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
        <ThemedText className="text-base">{label}</ThemedText>
        {description && (
          <ThemedText className="text-xs opacity-55">{description}</ThemedText>
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
      className={cn("flex-1")}
      onPress={() => onPress(value)}
    >
      {children}
    </Button>
  )
}
