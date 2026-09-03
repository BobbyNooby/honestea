import {
  IconArrowRight,
  IconCheck,
  IconInfoCircle,
  IconKey,
  IconLeaf,
  IconLayoutGrid,
  type Icon,
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
 * First-launch picker — split-tile direction. Two full-bleed colored
 * cards (matcha = Free/BYOK chat, oolong = Built in / keyless features)
 * with a "What's an API key?" pill button between them as a third path
 * for newcomers who don't know what BYOK means.
 *
 * Tap order:
 *  • Free tile (or its CTA) → /byok (paste key, get going)
 *  • "What's an API key?" pill → /api-key-info (explainer sheet)
 *  • Built-in tile / "Browse models" CTA → /model-browser (keyless)
 *  • "Skip" → routes to /byok with the flag still set so the screen
 *    doesn't reappear on next launch.
 *
 * The seen-flag is set on every exit path. User can reopen this screen
 * later from Settings → Developer.
 */
export default function OnboardingScreen() {
  const choose = async (path: "free" | "builtin" | "info") => {
    await markOnboardingSeen()
    if (path === "free") router.replace("/byok" as never)
    else if (path === "builtin") router.replace("/model-browser" as never)
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
            Two ways{"\n"}to start brewing.
          </Text>
          <Text className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Bring your own API key to chat. Everything stays on this device.
          </Text>
        </View>

        <BigTile
          tone="free"
          eyebrow="Available now"
          title="Free"
          tagline="Use your favorite models when you bring your own API key."
          bullets={[
            "Every model through one OpenRouter key",
            "Zero markup — pay providers directly",
            "See the exact cost of every message",
          ]}
          cta="Use my own key"
          Icon={IconKey}
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
              What's an API key?
            </Text>
          </Pressable>
        </View>

        <BigTile
          tone="builtin"
          eyebrow="Built in"
          title="Local"
          tagline="Keyless features that work right now, on this device."
          bullets={[
            "Browse 300+ models — no key needed",
            "Voice dictation with on-device speech",
            "Chats + keys never leave this phone",
          ]}
          cta="Browse models"
          Icon={IconLayoutGrid}
          onPress={() => choose("builtin")}
        />

        <Pressable
          onPress={() => choose("free")}
          hitSlop={8}
          className="self-center px-4 py-2"
        >
          <Text
            className="text-xs text-zinc-500 dark:text-zinc-500"
            style={{ textDecorationLine: "underline" }}
          >
            Skip — I'll set this up later
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

/**
 * Full-bleed colored card for one of the two onboarding paths. Solid
 * matcha (free) or oolong (built-in) fill, white type, decorative leaf
 * watermark, glass-morphism CTA pill at the bottom. The whole card is
 * tappable; the CTA pill is just visual reinforcement.
 */
function BigTile({
  tone,
  eyebrow,
  title,
  tagline,
  bullets,
  cta,
  Icon: IconCmp,
  onPress,
}: {
  tone: "free" | "builtin"
  eyebrow: string
  title: string
  tagline: string
  bullets: readonly string[]
  cta: string
  Icon: Icon
  onPress: () => void
}) {
  const dark = useColorScheme() === "dark"
  // Solid brand fills. Slightly darker in dark mode so the white type
  // still has enough contrast against the OLED-black surrounding bg.
  const bg =
    tone === "free"
      ? dark ? "#466b2c" : "#5b8a3a"
      : dark ? "#8a5e2e" : "#c2884a"
  const accent = tone === "free" ? "#aac882" : "#d9a26a"
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
          color: accent,
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
          fontSize: 36,
          letterSpacing: -0.7,
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
          <IconCmp size={20} color="#ffffff" strokeWidth={1.75} />
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
