import {
  IconChevronLeft,
  IconChevronRight,
  IconWorld,
} from "@tabler/icons-react-native"
import { Pressable, Text, useColorScheme, View } from "react-native"

import { formatUsd, type ChatProvider, type Message } from "@honestea/shared"

import { BrewingMark } from "@/components/brand/brewing-mark"
import { LogoMark } from "@/components/brand/logo-mark"
import { MarkdownText } from "@/components/markdown-text"
import { MessageActions } from "@/components/message-actions"

interface Props {
  message: Message
  /** True when this is the most recent visible assistant turn — gates the
   *  regenerate affordance and the bottom brand mark. */
  isLastAssistant: boolean
  /** Render the "earlier messages compacted" divider above this message. */
  showDividerAbove: boolean
  /** Streaming caption used while the assistant message has no content yet. */
  brewingPhrase: string
  /** True if any turn in the conversation is currently streaming — used to
   *  disable regenerate while we're mid-flight. */
  globallyStreaming: boolean
  /** Version-group siblings of this assistant message. Empty/length-1 hides
   *  the pagination chip. */
  versions: readonly Message[]
  /** Position of this message within `versions` (0-indexed). -1 if no group. */
  versionIdx: number
  onCopyText: (text: string) => Promise<void> | void
  onRegenerate: (assistantId: string) => void
  /** old → new ids of versions to swap. */
  onSwitchVersion: (oldId: string, newId: string) => void
}

/**
 * One message in the chat list. User messages render as a right-aligned
 * SMS bubble; assistant messages flow as plain markdown with a footer
 * (cost · model · via X), action row, and (only on the latest turn) a
 * brand sign-off mark — animated while streaming, static once done.
 */
export function ChatMessage({
  message,
  isLastAssistant,
  showDividerAbove,
  brewingPhrase,
  globallyStreaming,
  versions,
  versionIdx,
  onCopyText,
  onRegenerate,
  onSwitchVersion,
}: Props) {
  const isUser = message.role === "user"
  const usd =
    message.costUsd ??
    (typeof message.costCents === "number" ? message.costCents / 100 : null)
  const showCost = !isUser && usd != null
  const isErrored = message.status === "error"
  const isStreaming = message.status === "streaming"
  const hasVersions = versions.length > 1 && versionIdx !== -1

  if (isUser) {
    return (
      <View className="gap-2.5">
        {showDividerAbove && <CompactedDivider />}
        <Pressable
          onLongPress={() => onCopyText(message.content)}
          delayLongPress={400}
          className="self-end max-w-[85%] rounded-[22px] bg-matcha-600 px-3.5 py-2 dark:bg-matcha-400"
        >
          <Text className="text-base text-white">{message.content}</Text>
        </Pressable>
      </View>
    )
  }

  const showActions = message.status === "complete" || message.status === "error"

  return (
    <View className="gap-1">
      {showDividerAbove && <CompactedDivider />}
      <View className="self-stretch gap-1.5 px-1">
        {message.citations && message.citations.length > 0 && (
          <WebSearchChip count={message.citations.length} />
        )}
        {message.content ? (
          <MarkdownText>{message.content}</MarkdownText>
        ) : isStreaming ? (
          <Text className="text-base italic text-zinc-500 dark:text-zinc-400">
            {brewingPhrase}…
          </Text>
        ) : null}
        {isErrored && (
          <Text className="text-[10px] text-red-600 dark:text-red-400">
            Response failed to complete.
          </Text>
        )}
        {showCost && (
          <Text className="text-[10px] text-zinc-500 dark:text-zinc-400">
            ~{formatUsd(usd ?? 0)}
            {message.modelId ? ` · ${shortModelName(message.modelId)}` : ""}
            {message.provider ? ` · via ${providerLabel(message.provider)}` : ""}
          </Text>
        )}
        {showActions && (
          <View className="flex-row items-center justify-between">
            <MessageActions
              messageId={message.id}
              content={message.content}
              canRegenerate={isLastAssistant && !globallyStreaming}
              onRegenerate={() => onRegenerate(message.id)}
            />
            {hasVersions && (
              <VersionPagination
                current={versionIdx + 1}
                total={versions.length}
                onPrev={() => {
                  const prev = versions[versionIdx - 1]
                  if (prev) onSwitchVersion(message.id, prev.id)
                }}
                onNext={() => {
                  const next = versions[versionIdx + 1]
                  if (next) onSwitchVersion(message.id, next.id)
                }}
              />
            )}
          </View>
        )}
        {/* Brand sign-off — only on the most recent assistant turn,
         *  matching Claude's pattern. Animated while streaming, static
         *  once done. */}
        {isLastAssistant && (message.content || isStreaming) && (
          <View className="-ml-1 mt-1">
            {isStreaming ? <BrewingMark size={40} /> : <LogoMark size={40} />}
          </View>
        )}
      </View>
    </View>
  )
}

/**
 * `< n/total >` pagination chip — appears in the action row when an
 * assistant turn has multiple regenerated versions. Lets the user step
 * back to an older variant. Caller flips supersededAt between versions
 * via `onSwitchVersion`; the visible-message filter drives which one
 * actually renders.
 */
function VersionPagination({
  current,
  total,
  onPrev,
  onNext,
}: {
  current: number
  total: number
  onPrev: () => void
  onNext: () => void
}) {
  const dark = useColorScheme() === "dark"
  const tint = dark ? "#a1a1aa" : "#71717a"
  const disabled = dark ? "#3f3f46" : "#d4d4d8"
  const atFirst = current <= 1
  const atLast = current >= total
  return (
    <View className="flex-row items-center gap-0.5">
      <Pressable
        onPress={onPrev}
        disabled={atFirst}
        hitSlop={4}
        accessibilityLabel="Previous version"
        className="h-6 w-6 items-center justify-center rounded-md active:bg-zinc-100 dark:active:bg-zinc-900"
      >
        <IconChevronLeft
          size={14}
          color={atFirst ? disabled : tint}
          strokeWidth={1.75}
        />
      </Pressable>
      <Text className="text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">
        {current}/{total}
      </Text>
      <Pressable
        onPress={onNext}
        disabled={atLast}
        hitSlop={4}
        accessibilityLabel="Next version"
        className="h-6 w-6 items-center justify-center rounded-md active:bg-zinc-100 dark:active:bg-zinc-900"
      >
        <IconChevronRight
          size={14}
          color={atLast ? disabled : tint}
          strokeWidth={1.75}
        />
      </Pressable>
    </View>
  )
}

/**
 * Small chip rendered above an assistant message that consumed the
 * `openrouter:web_search` tool. The count comes from
 * `message.citations.length` — the number of distinct URLs the model
 * actually grounded its answer on. Future revision: tap to expand the
 * full source list.
 */
function WebSearchChip({ count }: { count: number }) {
  const dark = useColorScheme() === "dark"
  return (
    <View className="-ml-0.5 flex-row items-center gap-1 self-start rounded-full bg-matcha-500/15 px-2.5 py-1 dark:bg-matcha-400/20">
      <IconWorld
        size={12}
        color={dark ? "#a8c98a" : "#5b8a3a"}
        strokeWidth={2}
      />
      <Text className="text-[11px] font-medium text-matcha-700 dark:text-matcha-300">
        Searched the web · {count} {count === 1 ? "source" : "sources"}
      </Text>
    </View>
  )
}

function CompactedDivider() {
  return (
    <View className="my-3 flex-row items-center gap-2 px-2">
      <View className="h-px flex-1 bg-zinc-300 dark:bg-zinc-700" />
      <Text className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        earlier messages compacted
      </Text>
      <View className="h-px flex-1 bg-zinc-300 dark:bg-zinc-700" />
    </View>
  )
}

function shortModelName(id: string): string {
  return id.split("/").pop() ?? id
}

function providerLabel(provider: ChatProvider): string {
  return provider === "anthropic" ? "Anthropic" : "OpenRouter"
}
