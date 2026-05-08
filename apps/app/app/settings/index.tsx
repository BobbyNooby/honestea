import {
  IconAdjustmentsHorizontal,
  IconArrowRight,
  IconBell,
  IconChartLine,
  IconCreditCard,
  IconDeviceMobileVibration,
  IconHelpCircle,
  IconInfoCircle,
  IconKey,
  IconLockSquareRounded,
  IconMenu2,
  IconMoonStars,
  IconRefresh,
  IconShield,
  IconSparkles,
  IconStarFilled,
  IconTypography,
  IconUserCircle,
  IconWorld,
  type Icon,
} from "@tabler/icons-react-native"
import { Stack, router } from "expo-router"
import { useState } from "react"
import Toast from "react-native-toast-message"
import {
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { ColorModeSheet } from "@/components/settings/color-mode-sheet"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/cn"
import { clearRegistryCache } from "@/lib/model"
import { resetOnboarding } from "@/lib/onboarding-state"
import { useSidebar } from "@/lib/sidebar-context"
import { useThemePreference, type ThemePreference } from "@/lib/theme"
import {
  TYPE_BODY_SM,
  TYPE_CAPTION,
  TYPE_EYEBROW,
  TYPE_H3,
} from "@/lib/typography"

/**
 * Settings landing page. Matches the design-system handoff: custom
 * hamburger / serif title / info header, account card on top, four
 * grouped cards (Account · Capabilities · Personalization · Behavior).
 * Rows have no chevrons — the whole row is the affordance.
 *
 * Many rows are placeholders — they lock the visual shape so future
 * feature work slots in cleanly. Real today: API keys (via Connectors),
 * Usage, Color mode, Haptic feedback.
 */
export default function SettingsScreen() {
  const sidebar = useSidebar()
  const dark = useColorScheme() === "dark"
  const [pref, setPref] = useThemePreference()
  const [colorSheetOpen, setColorSheetOpen] = useState(false)
  const [hapticOn, setHapticOn] = useState(true)
  const tint = dark ? "#e4e4e7" : "#3f3f46"
  const tintMuted = dark ? "#a1a1aa" : "#71717a"

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
              text2: "v0.1.0 · Phase 1 (BYOK)",
            })
          }}
        >
          <IconInfoCircle size={22} color={tint} strokeWidth={1.75} />
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="px-3 pb-8 pt-1">
        <AccountCard />
        <UpgradeCard />

        <Card>
          <Row icon={IconUserCircle} label="Profile" disabled />
          <Row icon={IconCreditCard} label="Billing" disabled />
          <Row
            icon={IconChartLine}
            label="Usage"
            onPress={() => router.push("/settings/usage" as never)}
          />
        </Card>

        <Card>
          <Row icon={IconAdjustmentsHorizontal} label="Capabilities" disabled />
          <Row
            icon={IconKey}
            label="API Keys"
            sub="OpenRouter, Claude, GPT, Gemini"
            onPress={() => router.push("/byok" as never)}
          />
          <Row icon={IconShield} label="Permissions" disabled />
        </Card>

        <Card>
          <Row
            icon={IconMoonStars}
            label="Color mode"
            sub={describeTheme(pref)}
            onPress={() => setColorSheetOpen(true)}
          />
          <Row icon={IconTypography} label="Font style" sub="Default" disabled />
          <Row icon={IconWorld} label="Speech language" sub="English" disabled />
        </Card>

        <Card>
          <Row
            icon={IconDeviceMobileVibration}
            label="Haptic feedback"
            rightSlot={
              <Switch value={hapticOn} onValueChange={setHapticOn} />
            }
          />
          <Row icon={IconBell} label="Notifications" disabled />
          <Row icon={IconLockSquareRounded} label="Privacy" disabled />
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
            icon={IconSparkles}
            label="Open pricing page"
            sub="Preview the hosted-tier landing"
            onPress={() => router.push("/pricing" as never)}
          />
          <Row
            icon={IconHelpCircle}
            label="Open API key explainer"
            onPress={() => router.push("/api-key-info" as never)}
          />
          <Row
            icon={IconRefresh}
            label="Refresh model registry"
            sub="Re-fetches OpenRouter's model list on next launch"
            onPress={async () => {
              await clearRegistryCache()
              Toast.show({
                type: "success",
                text1: "Model cache cleared",
                text2: "Restart the app to refetch.",
                position: "bottom",
              })
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
              No account yet · sync coming in Phase 2
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
 * Matcha-tinted "consider Hosted" promo card rendered directly under
 * AccountCard. Phase 1 = everyone is in local mode, so this is always
 * visible today; once paid tiers ship, gate the render on the user's
 * tier (hide for paid/subscription accounts).
 *
 * The whole tile is a Pressable that routes to /pricing — same target
 * as the onboarding "Hosted" big tile and the Developer-section
 * "Open pricing page" row, so users have three discoverable entry
 * points into the hosted-tier preview.
 */
function UpgradeCard() {
  const dark = useColorScheme() === "dark"
  // Solid matcha fill (matcha-600 light / matcha-500 dark). Spec wanted
  // a gradient but we don't ship expo-linear-gradient yet — solid is
  // the documented fallback. Both shades give white type sufficient
  // contrast (>4.5:1) without needing a tint shift.
  const bg = dark ? "#6e9b4e" : "#5b8a3a"
  return (
    <Pressable
      onPress={() => router.push("/pricing" as never)}
      accessibilityRole="button"
      accessibilityLabel="Want to keep your chats forever? See hosted plans."
      style={{ backgroundColor: bg }}
      className="mb-3 overflow-hidden rounded-2xl px-4 py-4 active:opacity-90"
    >
      <View className="flex-row items-center gap-3">
        <View
          className="h-11 w-11 items-center justify-center rounded-xl"
          style={{
            backgroundColor: "rgba(255,255,255,0.18)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.3)",
          }}
        >
          <IconSparkles size={22} color="#ffffff" strokeWidth={1.75} />
        </View>
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-2">
            <Text
              className="text-white"
              style={TYPE_H3}
              numberOfLines={1}
            >
              Want to keep your chats forever?
            </Text>
          </View>
          <View className="mt-0.5 flex-row items-center gap-2">
            <View
              className="rounded-full px-1.5 py-0.5"
              style={{
                backgroundColor: "rgba(255,255,255,0.18)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.3)",
              }}
            >
              <Text className="text-white" style={TYPE_EYEBROW}>
                Soon
              </Text>
            </View>
            <Text
              className="flex-1 text-white"
              style={{ ...TYPE_BODY_SM, opacity: 0.92 }}
              numberOfLines={2}
            >
              Hosted plans add cloud sync, account history, and credits
              — without paid keys.
            </Text>
          </View>
        </View>
        <IconArrowRight size={18} color="#ffffff" strokeWidth={1.75} />
      </View>

      <View className="mt-3 flex-row gap-2">
        <TierPill label="PAYG" sub="$0/mo" />
        <TierPill label="Subscription" sub="from $15" highlighted />
        <TierPill label="Cloud BYOK" sub="$5/mo" />
      </View>
    </Pressable>
  )
}

/**
 * One of three side-by-side glass pills inside UpgradeCard. The
 * highlighted variant uses a slightly brighter background + border so
 * Subscription reads as the recommended tier without needing a label.
 */
function TierPill({
  label,
  sub,
  highlighted,
}: {
  label: string
  sub: string
  highlighted?: boolean
}) {
  return (
    <View
      className="flex-1 items-center rounded-xl px-2 py-2"
      style={{
        backgroundColor: highlighted
          ? "rgba(255,255,255,0.22)"
          : "rgba(255,255,255,0.10)",
        borderWidth: 1,
        borderColor: highlighted
          ? "rgba(255,255,255,0.4)"
          : "rgba(255,255,255,0.18)",
      }}
    >
      <Text
        className="text-white"
        style={{ ...TYPE_CAPTION, fontWeight: "600" }}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text
        className="mt-0.5 text-white"
        style={{ ...TYPE_CAPTION, opacity: 0.85 }}
        numberOfLines={1}
      >
        {sub}
      </Text>
    </View>
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
  /** Greys the row + suppresses press feedback. Used for placeholders. */
  disabled?: boolean
}

function Row({ icon: IconCmp, label, sub, onPress, rightSlot, disabled }: RowProps) {
  const dark = useColorScheme() === "dark"
  const tint = dark ? "#e4e4e7" : "#3f3f46"
  const interactive = !!onPress && !disabled
  return (
    <Pressable
      onPress={interactive ? onPress : undefined}
      disabled={!interactive && !rightSlot}
      className={cn(
        "flex-row items-center gap-3 px-4",
        sub ? "py-2.5" : "py-3",
        interactive && "active:bg-zinc-100 dark:active:bg-zinc-800",
        disabled && "opacity-60",
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
