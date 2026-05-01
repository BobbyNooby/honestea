import {
  IconBell,
  IconChartLine,
  IconChevronRight,
  IconDeviceMobile,
  IconInfoCircle,
  IconKey,
  IconMicrophone,
  IconMoon,
  IconShieldLock,
  IconTypography,
  type Icon,
} from "@tabler/icons-react-native"
import { router } from "expo-router"
import { useState } from "react"
import {
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { ColorModeSheet } from "@/components/color-mode-sheet"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/cn"
import { useThemePreference, type ThemePreference } from "@/lib/theme"

/**
 * Sectioned settings landing page. Matches the design reference: grouped
 * cards with icon + title (+ optional subtitle) + right slot rows. Most
 * non-essential rows are visual placeholders for now — they lock the
 * shape of the page so future feature work slots in cleanly.
 */
export default function SettingsScreen() {
  const [pref, setPref] = useThemePreference()
  const [colorSheetOpen, setColorSheetOpen] = useState(false)
  const [hapticOn, setHapticOn] = useState(true)

  return (
    <SafeAreaView
      className="flex-1 bg-chamomile-100 dark:bg-chamomile-900"
      edges={["bottom"]}
    >
      <ScrollView contentContainerClassName="p-4 gap-5">
        <Group>
          <Row
            icon={IconKey}
            title="API keys"
            subtitle="Bring your own provider keys."
            onPress={() => router.push("/byok" as never)}
          />
          <Divider />
          <Row
            icon={IconChartLine}
            title="Usage"
            subtitle="Spend and rate limits across providers."
            onPress={() => router.push("/settings/usage" as never)}
          />
        </Group>

        <Group>
          <Row
            icon={IconMoon}
            title="Color mode"
            subtitle={describeTheme(pref)}
            onPress={() => setColorSheetOpen(true)}
          />
          <Divider />
          <Row
            icon={IconTypography}
            title="Font scale"
            subtitle="Default"
            disabled
          />
          <Divider />
          <Row
            icon={IconMicrophone}
            title="Speech voice"
            subtitle="System default"
            disabled
          />
        </Group>

        <Group>
          <Row
            icon={IconDeviceMobile}
            title="Haptic feedback"
            rightSlot={
              <Switch
                value={hapticOn}
                onValueChange={setHapticOn}
              />
            }
          />
          <Divider />
          <Row icon={IconBell} title="Notifications" disabled />
          <Divider />
          <Row icon={IconShieldLock} title="Privacy" disabled />
        </Group>

        <Group>
          <Row
            icon={IconInfoCircle}
            title="Version"
            rightSlot={
              <Text className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                0.0.0
              </Text>
            }
          />
        </Group>
      </ScrollView>

      <ColorModeSheet
        open={colorSheetOpen}
        current={pref}
        onChange={setPref}
        onClose={() => setColorSheetOpen(false)}
      />
    </SafeAreaView>
  )
}

/** White (or zinc-900) rounded card grouping a set of related rows. */
function Group({ children }: { children: React.ReactNode }) {
  return (
    <View className="overflow-hidden rounded-2xl bg-white dark:bg-zinc-900">
      {children}
    </View>
  )
}

interface RowProps {
  icon: Icon
  title: string
  subtitle?: string
  onPress?: () => void
  rightSlot?: React.ReactNode
  /** Greys the row + suppresses press feedback. Used for placeholders. */
  disabled?: boolean
}

function Row({
  icon: IconCmp,
  title,
  subtitle,
  onPress,
  rightSlot,
  disabled,
}: RowProps) {
  const dark = useColorScheme() === "dark"
  const tint = dark ? "#e4e4e7" : "#3f3f46"
  const showChevron = !!onPress && !rightSlot
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled || (!onPress && !rightSlot)}
      className={cn(
        "flex-row items-center gap-4 px-4 py-3.5",
        onPress && !disabled && "active:bg-zinc-100 dark:active:bg-zinc-800",
        disabled && "opacity-60",
      )}
    >
      <IconCmp size={22} color={tint} strokeWidth={1.75} />
      <View className="flex-1 gap-0.5">
        <Text className="text-base text-zinc-900 dark:text-zinc-100">
          {title}
        </Text>
        {subtitle && (
          <Text className="text-xs text-zinc-500 dark:text-zinc-400">
            {subtitle}
          </Text>
        )}
      </View>
      {rightSlot}
      {showChevron && (
        <IconChevronRight
          size={16}
          color={dark ? "#52525b" : "#a1a1aa"}
          strokeWidth={2}
        />
      )}
    </Pressable>
  )
}

function Divider() {
  return <View className="h-px bg-zinc-100 dark:bg-zinc-800" />
}

function describeTheme(pref: ThemePreference): string {
  switch (pref) {
    case "system":
      return "System"
    case "light":
      return "Light"
    case "dark":
      return "Dark"
  }
}
