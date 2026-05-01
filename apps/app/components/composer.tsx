import {
  IconArrowUp,
  IconMicrophone,
  IconPlayerStopFilled,
  IconPlus,
  IconWorld,
  IconX,
} from "@tabler/icons-react-native"
import { Image } from "expo-image"
import { useEffect, useState } from "react"
import { Pressable, Text, View } from "react-native"
import Toast from "react-native-toast-message"

import { type Attachment } from "@honestea/shared"

import {
  ComposeMenu,
  type ResponseStyle,
} from "@/components/compose-menu"
import { RecordingPill } from "@/components/recording-pill"
import { Input } from "@/components/ui/input"
import { useSpeechRecognition } from "@/lib/speech-recognition"

interface Props {
  value: string
  onChange: (next: string) => void
  onSend: () => void
  streaming: boolean
  dark: boolean
  /** Web search toggle state — read by the chat screen once the request
   *  pipeline is wired up. */
  webSearch: boolean
  onToggleWebSearch: (next: boolean) => void
  /** Whether the active model supports OR's tool-calling (and therefore
   *  web search). Hides the Web pill + greys the menu toggle when false. */
  webSearchSupported: boolean
  /** Active response style — placeholder until the prompt prefix lands. */
  style: ResponseStyle
  onChangeStyle: (next: ResponseStyle) => void
  /** Attachments queued for the next send. Renders as chips above the
   *  input row with an X to remove. The compose menu populates this via
   *  the image / camera / file pickers. */
  attachments: readonly Attachment[]
  onAttachmentsChange: (next: Attachment[]) => void
  /** Whether the active model accepts image input. Greys the image /
   *  photo rows in the compose menu when false. */
  imageSupported: boolean
  /** Whether the active model accepts file input (PDFs). Greys the
   *  Add file row when false. */
  fileSupported: boolean
}

/**
 * Composer pill — textarea on top, action row underneath. Mirrors the
 * design kit's `Composer`: full-width rounded-26 card, transparent
 * TextInput, [+] attachment button on the left, [mic] / [send-or-stop] on
 * the right. The send affordance is a round matcha button with an up-arrow;
 * while streaming it becomes a square stop button.
 */
export function Composer({
  value,
  onChange,
  onSend,
  streaming,
  dark,
  webSearch,
  onToggleWebSearch,
  webSearchSupported,
  style,
  onChangeStyle,
  attachments,
  onAttachmentsChange,
  imageSupported,
  fileSupported,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const hasText = value.trim().length > 0
  const hasAttachments = attachments.length > 0
  const iconColor = dark ? "#e4e4e7" : "#3f3f46"

  const removeAttachment = (uri: string) => {
    onAttachmentsChange(attachments.filter((a) => a.uri !== uri))
  }

  const speech = useSpeechRecognition({
    onTranscript: (transcript) => {
      // Append a space + the recognized chunk to whatever the user
      // already typed. Trim the leading space when input is empty so
      // the composer starts cleanly.
      const next = value.length === 0 ? transcript : `${value} ${transcript}`
      onChange(next)
    },
  })

  useEffect(() => {
    if (speech.error) {
      Toast.show({
        type: "error",
        text1: "Voice input",
        text2: speech.error,
      })
    }
  }, [speech.error])

  const toggleMic = () => {
    if (speech.recording) speech.stop()
    else void speech.start()
  }

  // When recording or running the post-stop offline transcription
  // pass, the whole composer turns into the matcha RecordingPill —
  // replacing input + chips + actions with a focused X / waveform / ✓
  // widget (or a "Transcribing…" spinner during the file pass).
  if (speech.recording || speech.transcribing) {
    return (
      <View className="border-t border-zinc-200 bg-chamomile-50 px-3 pb-2 pt-2 dark:border-zinc-800 dark:bg-chamomile-900">
        <RecordingPill
          onCancel={speech.abort}
          onConfirm={speech.stop}
          transcribing={speech.transcribing}
        />
      </View>
    )
  }
  return (
    <View className="border-t border-zinc-200 bg-chamomile-50 px-3 pb-2 pt-2 dark:border-zinc-800 dark:bg-chamomile-900">
      <View className="rounded-[26px] border border-zinc-200 bg-chamomile-50 px-2 pb-1.5 pt-2 dark:border-zinc-800 dark:bg-zinc-900">
        {hasAttachments && (
          <>
            <View className="flex-row flex-wrap gap-2 px-2 pb-2">
              {attachments.map((att) => (
                <AttachmentChip
                  key={att.uri}
                  attachment={att}
                  onRemove={() => removeAttachment(att.uri)}
                />
              ))}
            </View>
            {!imageSupported &&
              attachments.some((a) => a.kind === "image") && (
                <Text className="px-3 pb-2 text-[11px] text-amber-700 dark:text-amber-400">
                  This model doesn't accept images — pick a different
                  model or remove the attachment to send.
                </Text>
              )}
            {!fileSupported &&
              attachments.some((a) => a.kind === "file") && (
                <Text className="px-3 pb-2 text-[11px] text-amber-700 dark:text-amber-400">
                  This model doesn't accept files — pick a different
                  model or remove the attachment to send.
                </Text>
              )}
          </>
        )}
        <Input
          value={value}
          onChangeText={onChange}
          placeholder="Reply to HonesTea…"
          placeholderTextColor={dark ? "#71717a" : "#a1a1aa"}
          multiline
          editable={!streaming}
          onSubmitEditing={onSend}
          returnKeyType="send"
          className="min-h-[24px] max-h-32 border-0 bg-transparent px-2 pb-1 text-[15px] leading-snug text-zinc-900 dark:text-zinc-100"
          style={{ borderWidth: 0 }}
        />
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-1">
            <Pressable
              onPress={() => setMenuOpen(true)}
              hitSlop={6}
              accessibilityLabel="Add attachment or change tools"
              className="h-9 w-9 items-center justify-center rounded-full active:opacity-70"
            >
              <IconPlus size={20} color={iconColor} strokeWidth={1.75} />
            </Pressable>
            {webSearch && webSearchSupported && (
              <Pressable
                onPress={() => onToggleWebSearch(false)}
                accessibilityLabel="Web search active — tap to disable"
                className="flex-row items-center gap-1 rounded-full bg-matcha-500/15 px-2.5 py-1 active:opacity-70 dark:bg-matcha-400/20"
              >
                <IconWorld
                  size={14}
                  color={dark ? "#a8c98a" : "#5b8a3a"}
                  strokeWidth={2}
                />
                <Text className="text-[11px] font-medium text-matcha-700 dark:text-matcha-300">
                  Web
                </Text>
              </Pressable>
            )}
          </View>
          <View className="flex-row items-center gap-1">
            {!streaming && !hasText && (
              <Pressable
                onPress={toggleMic}
                hitSlop={6}
                disabled={!speech.available}
                accessibilityLabel="Voice input"
                className="h-9 w-9 items-center justify-center rounded-full active:opacity-70"
              >
                <IconMicrophone
                  size={18}
                  color={
                    speech.available
                      ? iconColor
                      : dark
                        ? "#52525b"
                        : "#a1a1aa"
                  }
                  strokeWidth={1.75}
                />
              </Pressable>
            )}
            <Pressable
              onPress={streaming ? undefined : onSend}
              disabled={streaming ? false : !hasText && !hasAttachments}
              accessibilityLabel={streaming ? "Streaming" : "Send"}
              className="h-9 w-9 items-center justify-center rounded-full bg-matcha-600 active:opacity-80 dark:bg-matcha-400"
            >
              {streaming ? (
                <IconPlayerStopFilled size={14} color="#ffffff" />
              ) : (
                <IconArrowUp size={18} color="#ffffff" strokeWidth={2.25} />
              )}
            </Pressable>
          </View>
        </View>
      </View>
      <ComposeMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        webSearch={webSearch}
        onToggleWebSearch={onToggleWebSearch}
        webSearchSupported={webSearchSupported}
        style={style}
        onChangeStyle={onChangeStyle}
        onAddAttachment={(att) =>
          onAttachmentsChange([...attachments, att])
        }
        imageSupported={imageSupported}
        fileSupported={fileSupported}
      />
    </View>
  )
}

/**
 * Pending-attachment chip rendered above the input. For images: shows a
 * 56px thumbnail. For other kinds (PDFs land in a follow-up): a small
 * file pill with the name. The X button removes from the queue.
 */
function AttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: Attachment
  onRemove: () => void
}) {
  if (attachment.kind === "image") {
    return (
      <View className="overflow-hidden rounded-lg">
        <Image
          source={{ uri: attachment.uri }}
          style={{ width: 56, height: 56, borderRadius: 8 }}
          contentFit="cover"
        />
        <Pressable
          onPress={onRemove}
          accessibilityLabel="Remove attachment"
          hitSlop={4}
          className="absolute right-1 top-1 h-5 w-5 items-center justify-center rounded-full bg-black/60"
        >
          <IconX size={12} color="#ffffff" strokeWidth={2.5} />
        </Pressable>
      </View>
    )
  }
  // File chip — image attachments are above; this branch covers any
  // future kind (PDF, audio, etc.) so the composer survives the
  // commit-2 file-picker addition without another edit.
  return (
    <View className="flex-row items-center gap-2 rounded-full bg-zinc-100 px-3 py-1.5 dark:bg-zinc-800">
      <Text
        className="max-w-[120px] text-xs text-zinc-700 dark:text-zinc-300"
        numberOfLines={1}
      >
        {attachment.filename ?? "file"}
      </Text>
      <Pressable
        onPress={onRemove}
        hitSlop={4}
        accessibilityLabel="Remove attachment"
      >
        <IconX size={14} color="#71717a" strokeWidth={2.5} />
      </Pressable>
    </View>
  )
}
