import {
  IconCopy,
  IconPlayerStop,
  IconRefresh,
  IconShare3,
  IconVolume,
} from "@tabler/icons-react-native"
import * as Clipboard from "expo-clipboard"
import * as Haptics from "expo-haptics"
import { Pressable, Share, Text, useColorScheme, View } from "react-native"
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
 * Action row under each assistant message — labelled icons (`Copy`,
 * `Share`, `Speak`, `Regenerate`) styled per the design kit's `ActionBtn`:
 * 14px icon + 11px muted-zinc label, ghost row that tints on press.
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
    <View className="mt-1 -ml-1 flex-row items-center">
      <ActionBtn icon={IconCopy} label="Copy" onPress={copy} />
      <ActionBtn icon={IconShare3} label="Share" onPress={share} />
      <ActionBtn
        icon={isSpeaking ? IconPlayerStop : IconVolume}
        label={isSpeaking ? "Stop" : "Speak"}
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
      className="h-7 flex-row items-center gap-1 rounded-md px-2 active:bg-zinc-100 dark:active:bg-zinc-900"
    >
      <Icon size={14} color={tint} strokeWidth={1.75} />
      <Text className="text-[11px] text-zinc-500 dark:text-zinc-400">
        {label}
      </Text>
    </Pressable>
  )
}
