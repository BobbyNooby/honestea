import {
  IconChartLine,
  IconClock,
  IconHelpCircle,
  IconInfoCircle,
  IconKey,
  IconMenu2,
  IconMoonStars,
  IconRefresh,
  IconStarFilled,
  type Icon,
} from "@tabler/icons-react-native"
import { Stack, router } from "expo-router"
import { useEffect, useState } from "react"
import Toast from "react-native-toast-message"
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { ColorModeSheet } from "@/components/settings/color-mode-sheet"
import { cn } from "@/lib/cn"
import {
  cycleRegistryTtl,
  getRegistryTtlLabel,
  refreshRegistry,
} from "@/lib/model"
import { resetOnboarding } from "@/lib/onboarding-state"
import { useSidebar } from "@/lib/sidebar-context"
import { useThemePreference, type ThemePreference } from "@/lib/theme"

/**
 * Settings landing page: custom hamburger / serif title / info header,
 * local-mode card on top, grouped cards (Usage · Keys · Appearance),
 * then a Developer utility section. Real rows only — no placeholders.
 */
export default function SettingsScreen() {
  const sidebar = useSidebar()
  const dark = useColorScheme() === "dark"
  const [pref, setPref] = useThemePreference()
  const [colorSheetOpen, setColorSheetOpen] = useState(false)
  const [refreshingPrices, setRefreshingPrices] = useState(false)
  const [ttlLabel, setTtlLabel] = useState("Daily")
  useEffect(() => {
    getRegistryTtlLabel().then(setTtlLabel)
  }, [])
  const tint = dark ? "#e4e4e7" : "#3f3f46"

  return (
    <SafeAreaView
      className="flex-1 bg-chamomile-100 dark:bg-chamomile-900"
      edges={["top", "bottom"]}
    >
      {/* Hide the auto Stack header — we render our own per the design. */}
      <Stack.Screen options={{ headerShown: false }} />

      <View className="h-14 flex-row items-center px-3">
        <Pressable
          onPress={sidebar.open}
          hitSlop={6}
          accessibilityLabel="Open menu"
          className="h-10 w-10 items-center justify-center rounded-md active:bg-zinc-100 dark:active:bg-zinc-800"
        >
          <IconMenu2 size={22} color={tint} strokeWidth={1.75} />
        </Pressable>
        <View className="flex-1 items-center">
          <Text
            className="text-zinc-900 dark:text-zinc-100"
            style={{
              fontFamily: "Georgia",
              fontWeight: "600",
              fontSize: 20,
              letterSpacing: 0.2,
            }}
          >
            Settings
          </Text>
        </View>
        <Pressable
          hitSlop={6}
          accessibilityLabel="About"
          className="h-10 w-10 items-center justify-center rounded-md active:bg-zinc-100 dark:active:bg-zinc-800"
          onPress={() => {
            Toast.show({
              type: "info",
              text1: "HonesTea",
              text2: "v0.1.0 · local-first BYOK",
            })
          }}
        >
          <IconInfoCircle size={22} color={tint} strokeWidth={1.75} />
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="px-3 pb-8 pt-1">
        <AccountCard />

        <Card>
          <Row
            icon={IconChartLine}
            label="Usage"
            sub="Tokens and cost per model"
            onPress={() => router.push("/settings/usage" as never)}
          />
        </Card>

        <Card>
          <Row
            icon={IconKey}
            label="API Keys"
            sub="OpenRouter"
            onPress={() => router.push("/byok" as never)}
          />
          <Row
            icon={IconMoonStars}
            label="Color mode"
            sub={describeTheme(pref)}
            onPress={() => setColorSheetOpen(true)}
          />
        </Card>

        <SectionLabel>Developer</SectionLabel>
        <Card>
          <Row
            icon={IconStarFilled}
            label="Show onboarding again"
            sub="Resets the first-launch flag"
            onPress={async () => {
              await resetOnboarding()
              router.replace("/onboarding" as never)
            }}
          />
          <Row
            icon={IconHelpCircle}
            label="Open API key explainer"
            onPress={() => router.push("/api-key-info" as never)}
          />
          <Row
            icon={IconRefresh}
            label="Refresh model prices"
            sub="Re-fetches OpenRouter's live catalog now"
            onPress={async () => {
              if (refreshingPrices) return
              setRefreshingPrices(true)
              refreshRegistry()
                .then(() => {
                  Toast.show({
                    type: "success",
                    text1: "Models refreshed",
                    text2: "Prices and capabilities are up to date.",
                    position: "bottom",
                  })
                })
                .catch(() => {
                  Toast.show({
                    type: "error",
                    text1: "Refresh failed",
                    text2: "You appear to be offline.",
                    position: "bottom",
                  })
                })
                .finally(() => setRefreshingPrices(false))
            }}
            rightSlot={
              refreshingPrices ? (
                <ActivityIndicator size="small" className="mr-1" />
              ) : undefined
            }
          />
          <Row
            icon={IconClock}
            label="Price refresh interval"
            sub={ttlLabel}
            onPress={async () => {
              const next = await cycleRegistryTtl()
              setTtlLabel(next.label)
            }}
          />
        </Card>
      </ScrollView>

      <ColorModeSheet
        open={colorSheetOpen}
        current={pref}
        onChange={setPref}
        onClose={() => setColorSheetOpen(false)}
      />
    </SafeAreaView>
  )

  function AccountCard() {
    return (
      <View className="mb-3 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <View className="flex-row items-center gap-3 px-4 py-3">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-matcha-500/15 dark:bg-matcha-400/20">
            <Text className="text-[13px] font-semibold text-matcha-700 dark:text-matcha-300">
              HT
            </Text>
          </View>
          <View className="min-w-0 flex-1">
            <Text className="truncate text-[15px] text-zinc-900 dark:text-zinc-100">
              Local mode
            </Text>
            <Text
              className="truncate text-[12px] text-zinc-500 dark:text-zinc-400"
              numberOfLines={1}
            >
              Your keys and chats stay on this device
            </Text>
          </View>
        </View>
      </View>
    )
  }
}

/**
 * Small uppercase eyebrow rendered above a Card group. Used by the
 * Developer section so the card reads as a deliberate utility area
 * rather than another anonymous group.
 */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="mb-1.5 mt-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
      {children}
    </Text>
  )
}

/**
 * White (or zinc-900) card grouping a set of related rows. Inserts a
 * thin divider between rows — using a JSX-mapped divider rather than
 * `last:` border modifiers because RN doesn't expose `:last-child`.
 */
function Card({ children }: { children: React.ReactNode }) {
  const items = (Array.isArray(children) ? children : [children]).filter(
    (c) => c != null && c !== false,
  )
  return (
    <View className="mb-3 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {items.map((child, i) => (
        <View key={i}>
          {i > 0 && <View className="h-px bg-zinc-200 dark:bg-zinc-800" />}
          {child}
        </View>
      ))}
    </View>
  )
}

interface RowProps {
  icon: Icon
  label: string
  sub?: string
  onPress?: () => void
  rightSlot?: React.ReactNode
}

function Row({ icon: IconCmp, label, sub, onPress, rightSlot }: RowProps) {
  const dark = useColorScheme() === "dark"
  const tint = dark ? "#e4e4e7" : "#3f3f46"
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "flex-row items-center gap-3 px-4",
        sub ? "py-2.5" : "py-3",
        onPress && "active:bg-zinc-100 dark:active:bg-zinc-800",
      )}
    >
      <View className="h-7 w-7 items-center justify-center">
        <IconCmp size={22} color={tint} strokeWidth={1.75} />
      </View>
      <View className="flex-1">
        <Text className="text-[16px] text-zinc-900 dark:text-zinc-100">
          {label}
        </Text>
        {sub && (
          <Text className="mt-0.5 text-[13px] text-zinc-500 dark:text-zinc-400">
            {sub}
          </Text>
        )}
      </View>
      {rightSlot}
    </Pressable>
  )
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
