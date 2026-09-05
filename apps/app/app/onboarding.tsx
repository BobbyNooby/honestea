import {
  IconArrowRight,
  IconCheck,
  IconInfoCircle,
  IconKey,
  IconLeaf,
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

import { LogoMark } from "@/components/brand/logo-mark"
import { markOnboardingSeen } from "@/lib/onboarding-state"

/**
 * First launch — single BYOK path. One tile, one job: paste an OpenRouter
 * key and start chatting. Newcomers take the "What's an API key?" pill to
 * the explainer; "Skip" routes to /byok with the seen-flag still set so
 * the screen doesn't reappear on next launch.
 *
 * The seen-flag is set on every exit path. User can reopen this screen
 * later from Settings → Developer.
 */
export default function OnboardingScreen() {
  const choose = async (path: "free" | "info") => {
    await markOnboardingSeen()
    if (path === "free") router.replace("/byok" as never)
    else router.push("/api-key-info" as never)
  }

  return (
    <SafeAreaView
      className="flex-1 bg-chamomile-50 dark:bg-zinc-950"
      edges={["top", "bottom"]}
    >
      <ScrollView
        contentContainerClassName="flex-grow gap-4 px-4 pb-6 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center gap-2.5 px-2 pt-1">
          <LogoMark size={36} />
          <Text
            className="text-zinc-900 dark:text-zinc-100"
            style={{
              fontFamily: "Georgia",
              fontWeight: "600",
              fontSize: 20,
              letterSpacing: -0.4,
            }}
          >
            Hones<Text className="text-matcha-600 dark:text-matcha-400">T</Text>
            ea
          </Text>
        </View>

        <View className="px-2">
          <Text
            className="text-zinc-900 dark:text-zinc-100"
            style={{
              fontFamily: "Georgia",
              fontWeight: "600",
              fontSize: 30,
              lineHeight: 33,
              letterSpacing: -0.6,
            }}
          >
            Bring your own key.{"\n"}Brew anything.
          </Text>
          <Text className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            One OpenRouter key unlocks every model. Nothing leaves this
            device.
          </Text>
        </View>

        <BigTile
          eyebrow="Free"
          title="Your key, your chat"
          tagline="Paste an API key and you're in — no account, no subscription."
          bullets={[
            "Every model through one OpenRouter key",
            "Zero markup — you pay providers directly",
            "See the exact cost of every message",
            "Chats + keys never leave this phone",
          ]}
          cta="Use my own key"
          onPress={() => choose("free")}
        />

        <View className="relative h-7 items-center justify-center">
          <View className="absolute left-2 right-2 top-1/2 h-px bg-chamomile-100 dark:bg-zinc-800" />
          <Pressable
            onPress={() => choose("info")}
            hitSlop={8}
            className="z-10 flex-row items-center gap-1.5 rounded-full border border-chamomile-100 bg-chamomile-50 px-3 py-1.5 active:opacity-70 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <IconInfoCircle
              size={13}
              color="#466b2c"
              strokeWidth={1.75}
            />
            <Text className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              What’s an API key?
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => choose("free")}
          hitSlop={8}
          className="self-center px-4 py-2"
        >
          <Text
            className="text-xs text-zinc-500 dark:text-zinc-500"
            style={{ textDecorationLine: "underline" }}
          >
            Skip — I’ll set this up later
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

/**
 * Full-bleed matcha card. White type, decorative leaf watermark,
 * glass-morphism CTA pill at the bottom. The whole card is tappable; the
 * CTA pill is just visual reinforcement.
 */
function BigTile({
  eyebrow,
  title,
  tagline,
  bullets,
  cta,
  onPress,
}: {
  eyebrow: string
  title: string
  tagline: string
  bullets: readonly string[]
  cta: string
  onPress: () => void
}) {
  const dark = useColorScheme() === "dark"
  const bg = dark ? "#466b2c" : "#5b8a3a"
  return (
    <Pressable
      onPress={onPress}
      style={{ backgroundColor: bg }}
      className="overflow-hidden rounded-3xl px-5 py-5 active:opacity-90"
    >
      <View
        pointerEvents="none"
        style={{ position: "absolute", top: -12, right: -12, opacity: 0.15 }}
      >
        <IconLeaf size={140} color="#ffffff" strokeWidth={1.75} />
      </View>
      <Text
        className="text-white"
        style={{
          fontFamily: "Menlo",
          fontSize: 10,
          fontWeight: "700",
          letterSpacing: 0.8,
          textTransform: "uppercase",
          color: "#aac882",
          marginBottom: 4,
        }}
      >
        {eyebrow}
      </Text>
      <Text
        className="text-white"
        style={{
          fontFamily: "Georgia",
          fontWeight: "600",
          fontSize: 30,
          letterSpacing: -0.6,
        }}
      >
        {title}
      </Text>
      <Text
        className="mt-0.5 text-white"
        style={{ fontSize: 14, opacity: 0.92, lineHeight: 20 }}
      >
        {tagline}
      </Text>

      <View className="mt-3 mb-4 gap-1.5">
        {bullets.map((b) => (
          <View key={b} className="flex-row items-center gap-2">
            <IconCheck size={14} color="#ffffff" strokeWidth={2.5} />
            <Text
              className="flex-1 text-white"
              style={{ fontSize: 13, opacity: 0.95 }}
            >
              {b}
            </Text>
          </View>
        ))}
      </View>

      <View
        className="flex-row items-center justify-between rounded-full border px-4 py-3"
        style={{
          backgroundColor: "rgba(255,255,255,0.18)",
          borderColor: "rgba(255,255,255,0.3)",
        }}
      >
        <View className="flex-row items-center gap-2">
          <IconKey size={20} color="#ffffff" strokeWidth={1.75} />
          <Text
            className="text-white"
            style={{ fontSize: 15, fontWeight: "600" }}
          >
            {cta}
          </Text>
        </View>
        <IconArrowRight size={16} color="#ffffff" strokeWidth={1.75} />
      </View>
    </Pressable>
  )
}
