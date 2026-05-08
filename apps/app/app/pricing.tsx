import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconChevronDown,
  IconCircleCheckFilled,
  IconCloud,
  IconCoin,
  IconInfinity,
  IconKey,
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
import Toast from "react-native-toast-message"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import { SafeAreaView } from "react-native-safe-area-context"

import { LogoMark } from "@/components/brand/logo-mark"

/**
 * Hosted-tier landing. Reached from the onboarding screen's "See plans"
 * tile or from the Settings → Developer section.
 *
 * Order is intentional and reflects the simplified pricing model:
 *   1. Pay-as-you-go ($0/mo + markup) — the obvious entry point
 *   2. Subscription (from $15/mo) — highlighted, expandable into mini
 *      Pro/Max5/Max10 previews, with a "Compare full plans" button that
 *      pushes to /subscription-plans for the side-by-side view
 *   3. Cloud BYOK ($5/mo) — niche/sync, rendered compact since it's
 *      only attractive to a narrow user segment
 *
 * Stage 2 work — no Stripe checkout wired today; CTAs are visual.
 */
type PlanId = "payg" | "subscription" | "byok"

export default function PricingScreen() {
  const dark = useColorScheme() === "dark"
  // One-of selection. Not wired to checkout (Stage 2) — today the
  // selection drives the bottom "Notify me" CTA copy so the user can
  // express which plan they're interested in for telemetry later.
  const [selected, setSelected] = useState<PlanId | null>(null)
  return (
    <SafeAreaView
      className="flex-1 bg-chamomile-50 dark:bg-zinc-950"
      edges={["top", "bottom"]}
    >
      <View className="flex-row items-center px-2 pt-1">
        <Pressable
          onPress={() => {
            // Onboarding reaches /pricing via router.replace, so the
            // back stack is empty when arriving from there. Fall through
            // to /onboarding so the user lands somewhere sensible.
            if (router.canGoBack()) router.back()
            else router.replace("/onboarding" as never)
          }}
          hitSlop={12}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-zinc-100 dark:active:bg-zinc-900"
        >
          <IconArrowLeft
            size={22}
            color={dark ? "#e4e4e7" : "#18181b"}
            strokeWidth={1.75}
          />
        </Pressable>
      </View>

      <ScrollView
        contentContainerClassName="gap-3 px-4 pb-10"
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center pb-3 pt-1">
          <LogoMark size={48} />
          <Text
            className="mt-2.5 text-zinc-900 dark:text-zinc-100"
            style={{
              fontFamily: "Georgia",
              fontWeight: "600",
              fontSize: 28,
              letterSpacing: -0.6,
            }}
          >
            Hosted plans
          </Text>
          <Text className="mx-auto mt-2 max-w-[300px] text-center text-[13.5px] leading-5 text-zinc-600 dark:text-zinc-400">
            We handle the keys for you and pass on the best prices we can find.
          </Text>
        </View>

        <PlanCard
          Icon={IconCoin}
          title="Pay-as-you-go"
          price="$0"
          unit="/mo + credits"
          tagline="Top up, only pay for what you use"
          bullets={[
            "Conversations sync across devices",
            "Credits never expire",
            "~28-30% markup, billed from balance",
            "$7.99 minimum first deposit",
          ]}
          selected={selected === "payg"}
          onSelect={() => setSelected("payg")}
        />

        <ExpandableSubscriptionCard
          selected={selected === "subscription"}
          onSelect={() => setSelected("subscription")}
        />

        <PlanCard
          Icon={IconCloud}
          title="Cloud BYOK"
          price="$5"
          unit="/mo"
          tagline="Sync with your own keys"
          bullets={[
            "BYOK still — zero token markup",
            "Conversations sync across devices",
            "Niche: only if you want sync without hosting",
          ]}
          compact
          selected={selected === "byok"}
          onSelect={() => setSelected("byok")}
        />

        {selected && (
          <Pressable
            className="mt-1 flex-row items-center justify-center gap-2 rounded-2xl bg-zinc-900 py-3.5 active:opacity-90 dark:bg-white"
            onPress={() => {
              Toast.show({
                type: "success",
                text1: "You're on the list!",
                text2: "We'll let you know when hosted plans launch.",
              })
            }}
          >
            <IconCircleCheckFilled
              size={16}
              color={dark ? "#18181b" : "#ffffff"}
            />
            <Text
              className={
                dark
                  ? "text-[14.5px] font-semibold text-zinc-900"
                  : "text-[14.5px] font-semibold text-white"
              }
            >
              Notify me when {planLabel(selected)} launches
            </Text>
          </Pressable>
        )}

        <View className="mt-2 gap-2.5 rounded-3xl border border-chamomile-100 bg-chamomile-100 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <View className="flex-row items-center gap-2">
            <IconKey
              size={15}
              color={dark ? "#a8c98a" : "#466b2c"}
              strokeWidth={1.75}
            />
            <Text className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
              Want to start now?
            </Text>
          </View>
          <Text className="text-[13px] leading-5 text-zinc-600 dark:text-zinc-400">
            Free BYOK is shipping today. Bring an OpenRouter key and you'll
            have access to every model.
          </Text>
          <Pressable
            onPress={() => router.replace("/byok" as never)}
            className="mt-1 items-center justify-center rounded-2xl bg-matcha-600 py-3 active:opacity-90 dark:bg-matcha-500"
          >
            <Text className="text-[14.5px] font-semibold text-white">
              Use the free app
            </Text>
          </Pressable>
        </View>

        <Text className="px-3 pb-2 pt-1 text-center text-[11px] leading-4 text-zinc-500">
          Pricing isn't final. We'll publish exact terms before turning hosted
          plans on.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

/**
 * Subscription card with an inline "see plans" expand. Collapsed it
 * shows the headline price ("from $15"). Expanded it reveals three
 * compact sub-tier rows + a "Compare full plans" CTA that routes to
 * the dedicated `/subscription-plans` comparison screen.
 *
 * The chevron rotation + height reveal use Reanimated `withTiming`
 * for a 200ms ease-in/out — matching the design's "see plans ⌄" motion.
 *
 * Tap on the card body (outside the expand toggle) selects the plan;
 * the chevron row toggles the expanded view independently.
 */
function ExpandableSubscriptionCard({
  selected,
  onSelect,
}: {
  selected: boolean
  onSelect: () => void
}) {
  const [open, setOpen] = useState(false)
  const dark = useColorScheme() === "dark"
  const tint = dark ? "#a8c98a" : "#466b2c"

  const rotation = useSharedValue(0)
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }))

  const toggleExpand = () => {
    rotation.value = withTiming(open ? 0 : 180, { duration: 200 })
    setOpen((o) => !o)
  }

  return (
    <View
      className={
        selected
          ? "overflow-hidden rounded-3xl border-[3px] border-matcha-600 bg-matcha-500/5 dark:border-matcha-400 dark:bg-matcha-400/10"
          : "overflow-hidden rounded-3xl border-2 border-matcha-500 bg-white dark:bg-zinc-900"
      }
    >
      <Pressable onPress={onSelect} className="gap-3 p-[18px] active:opacity-90">
        <View className="flex-row items-start gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-matcha-500/15 dark:bg-matcha-400/20">
            <IconInfinity
              size={20}
              color={dark ? "#a8c98a" : "#5b8a3a"}
              strokeWidth={1.75}
            />
          </View>
          <View className="min-w-0 flex-1">
            <View className="flex-row flex-wrap items-center gap-2">
              <Text
                className="text-zinc-900 dark:text-zinc-100"
                style={{
                  fontFamily: "Georgia",
                  fontWeight: "600",
                  fontSize: 22,
                  letterSpacing: -0.4,
                }}
              >
                Subscription
              </Text>
              <View className="rounded-full bg-matcha-500/15 px-2 py-0.5 dark:bg-matcha-400/20">
                <Text
                  style={{
                    fontFamily: "Menlo",
                    fontSize: 9,
                    fontWeight: "700",
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                    color: tint,
                  }}
                >
                  Most popular
                </Text>
              </View>
              {selected && <SelectedCheck color={tint} />}
            </View>
            <Text className="mt-0.5 text-[12px] text-zinc-500 dark:text-zinc-400">
              Generous monthly hosted chat · synced
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-[13px] leading-tight text-zinc-500 dark:text-zinc-400">
              from
            </Text>
            <Text
              className="text-zinc-900 dark:text-zinc-100"
              style={{
                fontFamily: "Georgia",
                fontWeight: "700",
                fontSize: 22,
                lineHeight: 24,
                letterSpacing: -0.5,
              }}
            >
              $15
            </Text>
            <Text className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              /mo
            </Text>
          </View>
        </View>

      </Pressable>

      <Pressable
        onPress={toggleExpand}
        className="flex-row items-center justify-between border-t border-matcha-500/20 px-[18px] py-2.5 active:opacity-70 dark:border-matcha-400/20"
      >
        <Text
          className="text-[13px] font-semibold"
          style={{ color: tint }}
        >
          See plans
        </Text>
        <Animated.View style={chevronStyle}>
          <IconChevronDown size={16} color={tint} strokeWidth={2} />
        </Animated.View>
      </Pressable>

      {open && (
        <View className="gap-2.5 px-[18px] pb-[18px]">
          <SubTierMini
            name="Pro"
            price="$15"
            tagline="Solid daily use · 1× quota"
          />
          <SubTierMini
            name="Max 5"
            price="$60"
            tagline="5× quota · most popular"
            highlight
          />
          <SubTierMini
            name="Max 10"
            price="$100"
            tagline="10× quota · power users"
          />
          <Pressable
            onPress={() => router.push("/subscription-plans" as never)}
            className="mt-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-matcha-600 py-2.5 active:opacity-90 dark:bg-matcha-500"
          >
            <Text className="text-[14px] font-semibold text-white">
              Compare full plans
            </Text>
            <IconArrowRight size={14} color="#ffffff" strokeWidth={1.75} />
          </Pressable>
        </View>
      )}
    </View>
  )
}

function SubTierMini({
  name,
  price,
  tagline,
  highlight,
}: {
  name: string
  price: string
  tagline: string
  highlight?: boolean
}) {
  return (
    <View
      className={
        highlight
          ? "flex-row items-center justify-between gap-2.5 rounded-xl border border-matcha-500/40 bg-matcha-500/10 px-3 py-2.5 dark:bg-matcha-400/15"
          : "flex-row items-center justify-between gap-2.5 rounded-xl border border-transparent bg-zinc-100 px-3 py-2.5 dark:bg-zinc-800"
      }
    >
      <View className="min-w-0 flex-1">
        <Text className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
          {name}
        </Text>
        <Text className="mt-px text-[11.5px] text-zinc-600 dark:text-zinc-400">
          {tagline}
        </Text>
      </View>
      <Text className="text-[15px] font-bold text-zinc-900 dark:text-zinc-100">
        {price}
        <Text className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
          {" /mo"}
        </Text>
      </Text>
    </View>
  )
}

/**
 * Standard plan card. `compact` reduces the visual weight (smaller
 * title, slight opacity drop) — used for Cloud BYOK to telegraph that
 * it's an option rather than a primary recommendation.
 *
 * When `selected` is true the card grows a thicker matcha border + a
 * matcha tint and shows a check badge next to the title. The whole
 * card is the selection target.
 */
function PlanCard({
  Icon: IconCmp,
  title,
  price,
  unit,
  tagline,
  bullets,
  compact,
  selected,
  onSelect,
}: {
  Icon: Icon
  title: string
  price: string
  unit: string
  tagline: string
  bullets: readonly string[]
  compact?: boolean
  selected: boolean
  onSelect: () => void
}) {
  const dark = useColorScheme() === "dark"
  const tint = dark ? "#a8c98a" : "#5b8a3a"
  return (
    <Pressable
      onPress={onSelect}
      style={{ opacity: compact && !selected ? 0.95 : 1 }}
      className={
        selected
          ? "gap-3 rounded-3xl border-[3px] border-matcha-600 bg-matcha-500/5 p-[18px] active:opacity-90 dark:border-matcha-400 dark:bg-matcha-400/10"
          : "gap-3 rounded-3xl border border-chamomile-100 bg-white p-[18px] active:opacity-90 dark:border-zinc-800 dark:bg-zinc-900"
      }
    >
      <View className="flex-row items-start gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-matcha-500/15 dark:bg-matcha-400/20">
          <IconCmp size={20} color={tint} strokeWidth={1.75} />
        </View>
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-2">
            <Text
              className="text-zinc-900 dark:text-zinc-100"
              style={{
                fontFamily: "Georgia",
                fontWeight: "600",
                fontSize: compact ? 18 : 22,
                letterSpacing: -0.4,
              }}
            >
              {title}
            </Text>
            {selected && <SelectedCheck color={tint} />}
          </View>
          <Text className="mt-px text-[12px] text-zinc-500 dark:text-zinc-400">
            {tagline}
          </Text>
        </View>
        <View className="items-end">
          <Text
            className="text-zinc-900 dark:text-zinc-100"
            style={{
              fontFamily: "Georgia",
              fontWeight: "700",
              fontSize: compact ? 18 : 22,
              lineHeight: compact ? 18 : 22,
              letterSpacing: -0.4,
            }}
          >
            {price}
          </Text>
          <Text className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
            {unit}
          </Text>
        </View>
      </View>
      <View className="gap-1.5">
        {bullets.map((b) => (
          <View key={b} className="flex-row items-start gap-2">
            <IconCheck
              size={13}
              color={tint}
              strokeWidth={2.5}
              style={{ marginTop: 3 }}
            />
            <Text className="flex-1 text-[13px] leading-5 text-zinc-700 dark:text-zinc-300">
              {b}
            </Text>
          </View>
        ))}
      </View>
    </Pressable>
  )
}

/**
 * Small filled-circle check badge rendered next to a card title when
 * the card is the active selection. Sits inline with the title so it
 * reads as part of the heading, not a separate UI control.
 */
function SelectedCheck({ color }: { color: string }) {
  return (
    <View
      className="h-5 w-5 items-center justify-center rounded-full"
      style={{ backgroundColor: color }}
    >
      <IconCheck size={12} color="#ffffff" strokeWidth={3} />
    </View>
  )
}

function planLabel(p: PlanId): string {
  switch (p) {
    case "payg":
      return "Pay-as-you-go"
    case "subscription":
      return "Subscription"
    case "byok":
      return "Cloud BYOK"
  }
}
