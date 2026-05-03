import { useMemo } from "react"
import { Text, View } from "react-native"

import { LogoMark } from "@/components/brand/logo-mark"

/**
 * Quirky tea-themed greetings shown when a chat is empty. Picks one at
 * random per mount — keeps the empty state feeling alive without
 * drawing attention away from the composer. Voice matches the design
 * system: plainspoken, calm, no exclamation marks.
 */
const GREETINGS: readonly string[] = [
  "Kettle's hot. Ask me anything.",
  "Pull up a cup. What's on your mind?",
  "Fresh pot. What's brewing?",
  "First sip's on me.",
  "Empty cup, full attention.",
  "I've been waiting with the kettle on.",
  "Steeped and ready when you are.",
  "Quiet teahouse. You start.",
  "Two sugars or none — let's chat.",
  "Warm the pot, then start typing.",
  "Just off the boil.",
  "Fresh leaves, fresh thoughts.",
  "Pour your thoughts in below.",
  "The cup is yours.",
  "Sit down, take your time.",
]

function pickGreeting(): string {
  const idx = Math.floor(Math.random() * GREETINGS.length)
  return GREETINGS[idx] ?? GREETINGS[0]!
}

export function EmptyChatState() {
  const greeting = useMemo(() => pickGreeting(), [])
  return (
    <View className="flex-1 items-center justify-center gap-3 px-8 py-16">
      <LogoMark size={56} />
      <Text className="mt-2 text-center text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {greeting}
      </Text>
      <Text className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        Type a message below — replies stream in real time.
      </Text>
    </View>
  )
}
