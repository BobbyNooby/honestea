import {
  IconCopy,
  IconPlayerStop,
  IconRefresh,
  IconShare3,
  IconVolume,
} from "@tabler/icons-react-native"
import * as Clipboard from "expo-clipboard"
import * as Haptics from "expo-haptics"
import { Pressable, Share, useColorScheme, View } from "react-native"
import Toast from "react-native-toast-message"

import { useSpeech } from "@/lib/use-speech"

interface Props {
  messageId: string
  content: string
  /** Show the regenerate button. Only the latest assistant turn gets one. */
  canRegenerate: boolean
  onRegenerate: () => void
}

/**
 * Action row under each assistant message — icon-only buttons à la
 * Claude. Copy / Share / Speak / Regenerate (the last only on the
 * latest turn). Press tints the surrounding bg slightly; speaking
 * state lights the volume icon matcha.
 */
export function MessageActions({
  messageId,
  content,
  canRegenerate,
  onRegenerate,
}: Props) {
  const { speakingId, toggle } = useSpeech()
  const isSpeaking = speakingId === messageId

  const copy = async () => {
    if (!content) return
    await Clipboard.setStringAsync(content)
    Haptics.selectionAsync().catch(() => {})
    Toast.show({ type: "success", text1: "Copied" })
  }

  const share = async () => {
    if (!content) return
    try {
      await Share.share({ message: content })
    } catch {
      Toast.show({ type: "error", text1: "Share failed" })
    }
  }

  return (
    <View className="-ml-1 flex-row items-center">
      <ActionBtn icon={IconCopy} label="Copy" onPress={copy} />
      <ActionBtn icon={IconShare3} label="Share" onPress={share} />
      <ActionBtn
        icon={isSpeaking ? IconPlayerStop : IconVolume}
        label={isSpeaking ? "Stop speaking" : "Speak"}
        onPress={() => toggle(messageId, content)}
        active={isSpeaking}
      />
      {canRegenerate && (
        <ActionBtn icon={IconRefresh} label="Regenerate" onPress={onRegenerate} />
      )}
    </View>
  )
}

function ActionBtn({
  icon: Icon,
  label,
  onPress,
  active = false,
}: {
  icon: typeof IconCopy
  label: string
  onPress: () => void
  active?: boolean
}) {
  const dark = useColorScheme() === "dark"
  const muted = dark ? "#a1a1aa" : "#71717a"
  const tint = active ? (dark ? "#8eb56b" : "#5b8a3a") : muted
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      hitSlop={4}
      className="h-7 w-7 items-center justify-center rounded-md active:bg-zinc-100 dark:active:bg-zinc-900"
    >
      <Icon size={16} color={tint} strokeWidth={1.75} />
    </Pressable>
  )
}
