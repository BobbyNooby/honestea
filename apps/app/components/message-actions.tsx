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
import { toast } from "sonner-native"

import { useSpeech } from "@/lib/use-speech"

interface Props {
  messageId: string
  content: string
  /** Show the regenerate icon. Only the latest assistant turn gets one. */
  canRegenerate: boolean
  onRegenerate: () => void
}

/**
 * Action row under each assistant message — Claude/ChatGPT pattern.
 * Copy, Share, Speak, Regenerate. Skipping thumbs-up/down for now (no
 * consumer for the signal until the model browse page ships).
 */
export function MessageActions({
  messageId,
  content,
  canRegenerate,
  onRegenerate,
}: Props) {
  const dark = useColorScheme() === "dark"
  const tint = dark ? "#a1a1aa" : "#71717a" // zinc-400 / zinc-500
  const { speakingId, toggle } = useSpeech()
  const isSpeaking = speakingId === messageId

  const copy = async () => {
    if (!content) return
    await Clipboard.setStringAsync(content)
    Haptics.selectionAsync().catch(() => {})
    toast("Copied")
  }

  const share = async () => {
    if (!content) return
    try {
      await Share.share({ message: content })
    } catch {
      toast.error("Share failed")
    }
  }

  return (
    <View className="mt-2 flex-row gap-4 px-1">
      <ActionIcon icon={IconCopy} tint={tint} onPress={copy} label="Copy" />
      <ActionIcon icon={IconShare3} tint={tint} onPress={share} label="Share" />
      <ActionIcon
        icon={isSpeaking ? IconPlayerStop : IconVolume}
        tint={isSpeaking ? "#3b82f6" : tint}
        onPress={() => toggle(messageId, content)}
        label={isSpeaking ? "Stop speaking" : "Speak"}
      />
      {canRegenerate && (
        <ActionIcon
          icon={IconRefresh}
          tint={tint}
          onPress={onRegenerate}
          label="Regenerate"
        />
      )}
    </View>
  )
}

function ActionIcon({
  icon: Icon,
  tint,
  onPress,
  label,
}: {
  icon: typeof IconCopy
  tint: string
  onPress: () => void
  label: string
}) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityLabel={label}>
      <Icon size={20} color={tint} strokeWidth={1.75} />
    </Pressable>
  )
}
