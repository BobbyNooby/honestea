import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconInfinity,
} from "@tabler/icons-react-native"
import { router } from "expo-router"
import {
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

/**
 * Dedicated comparison screen for the three Subscription sub-tiers.
 * Reached from the "Compare full plans" CTA on the pricing page's
 * expandable Subscription card. Lets the user see Pro / Max 5 / Max 10
 * side-by-side without losing the rest of the pricing context.
 *
 * Each card has a quota badge ("1×" / "5×" / "10×"), bullets that
 * compound (Max 5 = "Everything in Pro" + extras), and its own CTA.
 * No checkout wired — Stage 2 work; today the buttons are visual.
 */
export default function SubscriptionPlansScreen() {
  const dark = useColorScheme() === "dark"
  return (
    <SafeAreaView
      className="flex-1 bg-chamomile-50 dark:bg-zinc-950"
      edges={["top", "bottom"]}
    >
      <View className="flex-row items-center px-2 pt-1">
        <Pressable
          onPress={() => {
            if (router.canGoBack()) router.back()
            else router.replace("/pricing" as never)
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
        <View className="items-center pb-4 pt-2">
          <View className="mb-3 flex-row items-center gap-1.5 self-center rounded-full bg-matcha-500/15 px-2.5 py-1 dark:bg-matcha-400/20">
            <IconInfinity
              size={11}
              color={dark ? "#a8c98a" : "#466b2c"}
              strokeWidth={2}
            />
            <Text
              className="text-matcha-700 dark:text-matcha-300"
              style={{
                fontFamily: "Menlo",
                fontSize: 10,
                fontWeight: "700",
                letterSpacing: 0.8,
                textTransform: "uppercase",
              }}
            >
              Subscription
            </Text>
          </View>
          <Text
            className="text-center text-zinc-900 dark:text-zinc-100"
            style={{
              fontFamily: "Georgia",
              fontWeight: "600",
              fontSize: 30,
              lineHeight: 33,
              letterSpacing: -0.6,
            }}
          >
            Pick your size
          </Text>
          <Text className="mx-auto mt-2 max-w-[280px] text-center text-[13.5px] leading-5 text-zinc-600 dark:text-zinc-400">
            All tiers include generous monthly chat on the curated set. Larger
            tiers raise quotas on premium models.
          </Text>
        </View>

        <BigPlanCard
          name="Pro"
          price="$15"
          quota="1×"
          tagline="Solid daily use"
          bullets={[
            "Generous monthly chat on the curated set",
            "Standard quota on premium models",
            "All core features",
          ]}
          ctaLabel="Choose Pro"
        />
        <BigPlanCard
          name="Max 5"
          price="$60"
          quota="5×"
          tagline="Most popular for power users"
          bullets={[
            "Everything in Pro",
            "5× the quota on premium models",
            "Priority routing during peak load",
          ]}
          highlight
          ctaLabel="Choose Max 5"
        />
        <BigPlanCard
          name="Max 10"
          price="$100"
          quota="10×"
          tagline="For very heavy users"
          bullets={[
            "Everything in Max 5",
            "10× the quota on premium models",
            "Highest concurrent request limits",
          ]}
          ctaLabel="Choose Max 10"
        />

        <Text className="mt-2 px-3 pb-2 text-center text-[11px] leading-4 text-zinc-500">
          Quotas reset monthly. Cancel or change tier anytime. Pricing isn't
          final — exact terms before launch.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

function BigPlanCard({
  name,
  price,
  quota,
  tagline,
  bullets,
  highlight,
  ctaLabel,
}: {
  name: string
  price: string
  quota: string
  tagline: string
  bullets: readonly string[]
  highlight?: boolean
  ctaLabel: string
}) {
  const dark = useColorScheme() === "dark"
  const tint = dark ? "#a8c98a" : "#466b2c"
  return (
    <View
      className={
        highlight
          ? "relative gap-3.5 rounded-3xl border-2 border-matcha-500 bg-white p-5 dark:bg-zinc-900"
          : "relative gap-3.5 rounded-3xl border border-chamomile-100 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
      }
    >
      {highlight && (
        <View className="absolute -top-2.5 left-5 rounded-full bg-matcha-600 px-2.5 py-1 dark:bg-matcha-500">
          <Text
            className="text-white"
            style={{
              fontFamily: "Menlo",
              fontSize: 9,
              fontWeight: "700",
              letterSpacing: 0.8,
              textTransform: "uppercase",
            }}
          >
            Most popular
          </Text>
        </View>
      )}

      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text
            className="text-zinc-900 dark:text-zinc-100"
            style={{
              fontFamily: "Georgia",
              fontWeight: "600",
              fontSize: 28,
              letterSpacing: -0.6,
            }}
          >
            {name}
          </Text>
          <Text className="mt-0.5 text-[13px] text-zinc-600 dark:text-zinc-400">
            {tagline}
          </Text>
        </View>
        <View className="items-end">
          <Text
            className="text-zinc-900 dark:text-zinc-100"
            style={{
              fontFamily: "Georgia",
              fontWeight: "700",
              fontSize: 32,
              lineHeight: 32,
              letterSpacing: -0.5,
            }}
          >
            {price}
            <Text className="text-[14px] font-medium text-zinc-500 dark:text-zinc-400">
              /mo
            </Text>
          </Text>
          <View
            className="mt-1.5 self-end rounded-full bg-matcha-500/15 px-2 py-0.5 dark:bg-matcha-400/20"
          >
            <Text
              style={{
                fontFamily: "Menlo",
                fontSize: 10,
                fontWeight: "700",
                letterSpacing: 0.4,
                color: tint,
              }}
            >
              {quota} quota
            </Text>
          </View>
        </View>
      </View>

      <View className="gap-1.5">
        {bullets.map((b) => (
          <View key={b} className="flex-row items-start gap-2">
            <IconCheck
              size={13}
              color={dark ? "#a8c98a" : "#5b8a3a"}
              strokeWidth={2.5}
              style={{ marginTop: 3 }}
            />
            <Text className="flex-1 text-[13px] leading-5 text-zinc-700 dark:text-zinc-300">
              {b}
            </Text>
          </View>
        ))}
      </View>

      <Pressable
        className={
          highlight
            ? "mt-1 flex-row items-center justify-center gap-1.5 rounded-2xl bg-matcha-600 py-3.5 active:opacity-90 dark:bg-matcha-500"
            : "mt-1 flex-row items-center justify-center gap-1.5 rounded-2xl border-[1.5px] border-matcha-600 bg-white py-3.5 active:opacity-70 dark:border-matcha-500 dark:bg-zinc-900"
        }
      >
        <Text
          className={
            highlight
              ? "text-[14.5px] font-semibold text-white"
              : "text-[14.5px] font-semibold text-matcha-700 dark:text-matcha-400"
          }
        >
          {ctaLabel}
        </Text>
        <IconArrowRight
          size={14}
          color={highlight ? "#ffffff" : tint}
          strokeWidth={1.75}
        />
      </Pressable>
    </View>
  )
}
