import {
  IconArrowLeft,
  IconShield,
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
 * "What's an API key?" explainer reachable from the onboarding pill
 * or (later) from the BYOK screen as a help link. Plain language for
 * users who've never seen an API key and don't know what BYOK means.
 *
 * Lists the four supported providers with a one-line "best for" so a
 * newcomer can pick without bouncing across docs.
 */
export default function ApiKeyInfoScreen() {
  const dark = useColorScheme() === "dark"
  const tint = dark ? "#a8c98a" : "#466b2c"
  return (
    <SafeAreaView
      className="flex-1 bg-chamomile-50 dark:bg-zinc-950"
      edges={["top", "bottom"]}
    >
      <View className="h-12 flex-row items-center justify-between px-2">
        <Pressable
          onPress={() => {
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
        <Text className="text-[13px] font-semibold text-zinc-600 dark:text-zinc-400">
          New here?
        </Text>
        <View className="w-10" />
      </View>

      <ScrollView
        contentContainerClassName="gap-3 px-4 pb-8"
        showsVerticalScrollIndicator={false}
      >
        <View className="px-2 pb-2 pt-2">
          <Text
            className="text-zinc-900 dark:text-zinc-100"
            style={{
              fontFamily: "Georgia",
              fontWeight: "600",
              fontSize: 30,
              lineHeight: 34,
              letterSpacing: -0.6,
            }}
          >
            What’s an API key?
          </Text>
          <Text className="mt-2.5 text-sm text-zinc-600 dark:text-zinc-400">
            A short code from an AI provider that lets HonesTea talk to their
            models on your behalf. You pay the provider directly — we never see
            your key.
          </Text>
        </View>

        <InfoBlock
          eyebrow="Easiest"
          title="OpenRouter"
          body="One key unlocks every model — Claude, GPT, Gemini, open-source — billed from a single balance. Recommended if you want the most options."
          recommended
        />
        <InfoBlock
          title="Anthropic (Claude)"
          body="Sign in at console.anthropic.com → API Keys. Best if you only want Claude — and gets you direct prompt caching."
        />
        <InfoBlock
          title="OpenAI (GPT)"
          body="Sign in at platform.openai.com → API Keys. For GPT-5, GPT-4o, and the o-series reasoning models."
        />
        <InfoBlock
          title="Google (Gemini)"
          body="Get a key from aistudio.google.com. Has a generous free tier on most Gemini models — good place to start if you don't want to pay anything yet."
        />

        <View
          className="mt-2 flex-row gap-2.5 rounded-2xl border p-3.5"
          style={{
            backgroundColor: dark ? "#5b8a3a14" : "#5b8a3a14",
            borderColor: dark ? "#5b8a3a33" : "#5b8a3a33",
          }}
        >
          <IconShield size={16} color={tint} strokeWidth={1.75} />
          <Text className="flex-1 text-[12.5px] leading-5 text-zinc-700 dark:text-zinc-300">
            <Text style={{ color: tint, fontWeight: "600" }}>
              Your key stays on your device.
            </Text>{" "}
            HonesTea encrypts it in your phone’s secure storage and sends it
            directly to the provider. We don’t proxy or log it.
          </Text>
        </View>

        <Pressable
          onPress={() => {
            if (router.canGoBack()) router.back()
            else router.replace("/onboarding" as never)
          }}
          className="mt-2 items-center justify-center rounded-2xl bg-matcha-600 py-3.5 active:opacity-90 dark:bg-matcha-500"
        >
          <Text className="text-[15px] font-semibold text-white">Got it</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

function InfoBlock({
  eyebrow,
  title,
  body,
  recommended,
}: {
  eyebrow?: string
  title: string
  body: string
  recommended?: boolean
}) {
  return (
    <View
      className={
        recommended
          ? "gap-1 rounded-2xl border-2 border-matcha-500 bg-white p-4 dark:bg-zinc-900"
          : "gap-1 rounded-2xl border border-chamomile-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
      }
    >
      {eyebrow && (
        <Text
          className="text-matcha-700 dark:text-matcha-400"
          style={{
            fontFamily: "Menlo",
            fontSize: 10,
            fontWeight: "700",
            letterSpacing: 0.8,
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </Text>
      )}
      <Text
        className="text-zinc-900 dark:text-zinc-100"
        style={{
          fontFamily: "Georgia",
          fontWeight: "600",
          fontSize: 18,
          letterSpacing: -0.3,
        }}
      >
        {title}
      </Text>
      <Text className="text-[13px] leading-5 text-zinc-600 dark:text-zinc-400">
        {body}
      </Text>
    </View>
  )
}
