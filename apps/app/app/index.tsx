import {
  IconArrowUp,
  IconChevronLeft,
  IconChevronRight,
  IconCloud,
  IconDeviceMobile,
  IconKey,
  IconMenu2,
  IconMicrophone,
  IconPlayerStopFilled,
  IconPlus,
} from "@tabler/icons-react-native"
import * as Clipboard from "expo-clipboard"
import * as Haptics from "expo-haptics"
import { router } from "expo-router"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  useColorScheme,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import Toast from "react-native-toast-message"

import { estimateTokens, formatUsd, type Message } from "@honestea/shared"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BrewingMark } from "@/components/brand/brewing-mark"
import { LogoMark } from "@/components/brand/logo-mark"
import { ChatActionsMenu } from "@/components/chat-actions-menu"
import { ChatStatusRow } from "@/components/chat-status-row"
import { MarkdownText } from "@/components/markdown-text"
import { MessageActions } from "@/components/message-actions"
import { ModelSelector } from "@/components/model-selector"
import { RenameDialog } from "@/components/rename-dialog"
import { streamChat } from "@/lib/api"
import { useByokStatus } from "@/lib/byok"
import { compact, projectPromptTokens } from "@/lib/compaction"
import { useConfirm } from "@/lib/confirm-context"
import { useBrewingPhrase } from "@/lib/brewing-phrases"
import { useConversations } from "@/lib/conversations-context"
import {
  addMessage,
  listMessages,
  markMessagesSupersededFrom,
  renameConversation,
  setMessageSupersededAt,
  updateMessage,
} from "@/lib/db/repository"
import { generateTitle } from "@/lib/title-gen"
import {
  findModel,
  pricingFor,
  useModelRegistry,
  type RegistryModel,
} from "@/lib/model-registry"
import { useSelectedModel } from "@/lib/selected-model"
import { useSidebar } from "@/lib/sidebar-context"

export default function ChatScreen() {
  const sidebar = useSidebar()
  const byok = useByokStatus()
  const { registry } = useModelRegistry()
  const { modelId, setModelId } = useSelectedModel()
  const conversations = useConversations()
  const confirm = useConfirm()
  const dark = useColorScheme() === "dark"
  const brewingPhrase = useBrewingPhrase(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [renameTarget, setRenameTarget] = useState<{
    id: string
    title: string | null
  } | null>(null)
  const listRef = useRef<FlatList<Message>>(null)

  const currentConversation = useMemo(
    () =>
      conversations.conversations.find(
        (c) => c.id === conversations.currentId,
      ) ?? null,
    [conversations.conversations, conversations.currentId],
  )

  // Visible rows = normal-kind, not superseded, not summarized. The hidden
  // ones (superseded by regenerate, summarized by compaction, or kind="summary"
  // synthetic rows) stay in `messages` so their cost rolls into the
  // conversation total and the send-path can include the summary, but they
  // don't render as chat bubbles.
  const visibleMessages = useMemo(
    () =>
      messages.filter(
        (m) =>
          m.supersededAt === null &&
          m.summarizedAt === null &&
          m.kind !== "summary",
      ),
    [messages],
  )

  // First visible message id that follows at least one summarized row —
  // we render a "earlier messages compacted" divider directly above it.
  // Null when nothing's been compacted yet.
  const dividerBeforeId = useMemo(() => {
    if (!messages.some((m) => m.summarizedAt !== null)) return null
    return visibleMessages[0]?.id ?? null
  }, [messages, visibleMessages])

  // Index of the latest visible assistant message — only it gets the
  // regenerate affordance, since regenerating a middle turn would discard
  // everything after it.
  const lastAssistantIdx = useMemo(() => {
    for (let i = visibleMessages.length - 1; i >= 0; i--) {
      if (visibleMessages[i]?.role === "assistant") return i
    }
    return -1
  }, [visibleMessages])

  /**
   * Group assistant messages into "version groups" by which user message
   * immediately precedes them in chronological order. All regenerations of
   * the same turn end up in one group (some superseded, one active). Lets
   * the per-message footer render `< n/total >` pagination so the user
   * can navigate back to an older version of a regenerated reply.
   */
  const versionsByAnchor = useMemo(() => {
    const groups = new Map<string, Message[]>()
    let lastUser: Message | null = null
    const sorted = [...messages].sort((a, b) => a.createdAt - b.createdAt)
    for (const m of sorted) {
      if (m.summarizedAt !== null) continue
      if (m.kind !== "normal") continue
      if (m.role === "user") {
        lastUser = m
      } else if (m.role === "assistant" && lastUser) {
        const arr = groups.get(lastUser.id) ?? []
        arr.push(m)
        groups.set(lastUser.id, arr)
      }
    }
    return groups
  }, [messages])

  /** O(n) lookup: assistant message id → anchor (preceding user message id). */
  const anchorByAssistant = useMemo(() => {
    const map = new Map<string, string>()
    for (const [anchor, versions] of versionsByAnchor.entries()) {
      for (const v of versions) map.set(v.id, anchor)
    }
    return map
  }, [versionsByAnchor])

  /**
   * Switch which version of a turn is "active". Flips supersededAt on the
   * old + new versions; the visible-message filter does the rest.
   */
  const switchVersion = useCallback(
    async (oldId: string, newId: string) => {
      const ts = Date.now()
      await Promise.all([
        setMessageSupersededAt(newId, null),
        setMessageSupersededAt(oldId, ts),
      ])
      if (conversations.currentId) {
        const fresh = await listMessages(conversations.currentId)
        setMessages(fresh)
      }
    },
    [conversations.currentId],
  )

  // Load messages when the current conversation changes (sidebar selection,
  // or on initial app launch resuming the last-used convo).
  useEffect(() => {
    if (!conversations.currentId) {
      setMessages([])
      return
    }
    let cancelled = false
    listMessages(conversations.currentId).then((rows) => {
      if (!cancelled) setMessages(rows)
    })
    return () => {
      cancelled = true
    }
  }, [conversations.currentId])

  /**
   * Run a compaction pass against the current conversation. Returns true
   * on success so callers (pre-send, manual button) can decide whether to
   * proceed or bail. Toasts feedback either way.
   */
  const runCompaction = useCallback(async (): Promise<boolean> => {
    if (!conversations.currentId) return false
    const model = registry ? findModel(registry, modelId) : null
    if (!model?.context_length) return false
    const fresh = await listMessages(conversations.currentId)
    const result = await compact({
      conversationId: conversations.currentId,
      messages: fresh,
      modelContextLength: model.context_length,
    })
    if (!result.ok) {
      Toast.show({
        type: "error",
        text1: "Compaction failed",
        text2: result.error,
      })
      return false
    }
    Toast.show({
      type: "success",
      text1: `Compacted ${result.summarizedCount} earlier messages`,
    })
    // Refresh in-memory state so divider + filtered view update.
    const refreshed = await listMessages(conversations.currentId)
    setMessages(refreshed)
    return true
  }, [conversations.currentId, modelId, registry])

  const handleModelChange = useCallback(
    async (next: string) => {
      setModelId(next)
      void conversations.updateCurrentModel(next)
      // If the new model has a smaller context window AND we're already
      // over 80% of it, auto-compact on switch instead of letting the user
      // hit a wall on their next send.
      const newModel = registry ? findModel(registry, next) : null
      if (newModel?.context_length) {
        const projected = projectPromptTokens(messages)
        if (projected > newModel.context_length * 0.8) {
          await runCompaction()
        }
      }
    },
    [conversations, messages, registry, runCompaction, setModelId],
  )

  const copyMessage = useCallback(async (text: string) => {
    if (!text) return
    await Clipboard.setStringAsync(text)
    Haptics.selectionAsync().catch(() => {})
    Toast.show({ type: "success", text1: "Copied" })
  }, [])

  /**
   * Stream an assistant turn given the messages that should form its
   * context. Inserts the streaming row, drives the SSE, finalizes content +
   * usage on done. Does NOT insert a user message — caller controls that
   * (send adds one, regenerate doesn't).
   */
  const streamAssistantTurn = useCallback(
    async (params: {
      conversationId: string
      contextMessages: Message[]
      isFirstTurn: boolean
      firstTurnText?: string
    }) => {
      const { conversationId, contextMessages, isFirstTurn, firstTurnText } =
        params

      const assistantRow = await addMessage({
        conversationId,
        role: "assistant",
        content: "",
        modelId,
        status: "streaming",
      })

      setMessages((m) => [...m, assistantRow])

      // Pre-compute the prompt-side cost once. Recomputing per-token would
      // be wasteful since the prompt isn't changing during the stream.
      // Pricing comes from OR's live registry — same source as the real
      // `usage.cost` we'll snap to on completion, so estimate / real are on
      // the same scale (no markup applied either side).
      // Send-path filter: drop superseded (regenerated) AND summarized
      // (compacted) rows. Summary rows themselves stay — they ARE the
      // compacted context. Their summarizedAt is null so they pass through.
      const visibleContext = contextMessages.filter(
        (m) => m.supersededAt === null && m.summarizedAt === null,
      )
      const registryModel = registry ? findModel(registry, modelId) : null
      const pricing = registryModel ? pricingFor(registryModel) : null
      const promptTokensEst = estimateTokens(
        visibleContext.map((m) => m.content).join("\n"),
      )
      const promptCostUsd = pricing
        ? (promptTokensEst / 1_000_000) * pricing.inputCostPerMillion
        : 0
      const liveCostFor = (completion: string): number | null => {
        if (!pricing) return null
        const completionTokens = estimateTokens(completion)
        return (
          promptCostUsd +
          (completionTokens / 1_000_000) * pricing.outputCostPerMillion
        )
      }

      let buffer = ""
      try {
        const result = await streamChat({
          model: modelId,
          // Only send non-superseded messages — superseded rows are old
          // regenerated turns hidden from the UI and irrelevant to the
          // model.
          messages: visibleContext.map(({ role, content }) => ({
            role,
            content,
          })),
          onToken: (chunk) => {
            buffer += chunk
            const liveUsd = liveCostFor(buffer)
            setMessages((m) =>
              m.map((msg) =>
                msg.id === assistantRow.id
                  ? { ...msg, content: buffer, costUsd: liveUsd }
                  : msg,
              ),
            )
          },
        })

        const promptTokens =
          result.usage?.promptTokens ?? promptTokensEst
        const completionTokens =
          result.usage?.completionTokens ?? estimateTokens(buffer)

        // Real OR cost wins. Otherwise hold the streaming estimate.
        const costUsd =
          result.usage?.costUsd != null
            ? result.usage.costUsd
            : liveCostFor(buffer)

        await updateMessage(assistantRow.id, {
          content: buffer,
          status: "complete",
          modelId,
          promptTokens,
          completionTokens,
          costUsd,
          provider: result.provider,
        })

        setMessages((m) =>
          m.map((msg) =>
            msg.id === assistantRow.id
              ? {
                  ...msg,
                  content: buffer,
                  status: "complete",
                  costUsd,
                  promptTokens,
                  completionTokens,
                  provider: result.provider,
                }
              : msg,
          ),
        )

        if (isFirstTurn && firstTurnText) {
          void generateTitle({
            userMessage: firstTurnText,
            assistantResponse: buffer,
          }).then(async (title) => {
            if (!title) return
            await renameConversation(conversationId, title)
            await conversations.refresh()
          })
        }
      } catch (e) {
        const errorText = e instanceof Error ? e.message : "unknown error"
        setError(errorText)
        // Persist the partial estimate so the cost we already accrued
        // doesn't disappear from the conversation total.
        const partialCostUsd = liveCostFor(buffer)
        await updateMessage(assistantRow.id, {
          content: buffer,
          status: "error",
          costUsd: partialCostUsd,
        })
        setMessages((m) =>
          m.map((msg) =>
            msg.id === assistantRow.id
              ? {
                  ...msg,
                  content: buffer,
                  status: "error",
                  costUsd: partialCostUsd,
                }
              : msg,
          ),
        )
      }
    },
    [conversations, modelId, registry],
  )

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming) return

    setError(null)
    setStreaming(true)
    setInput("")

    try {
      const conversationId =
        conversations.currentId ?? (await conversations.startNew(modelId))

      // Pre-send compaction guard: if firing the next request would push us
      // over 80% of the model's context, summarize older turns first. The
      // compact() call is sync (we await it before sending) so the user
      // sees one extra second of latency on this turn but every subsequent
      // turn fits cleanly. Better than refusing the send or silently
      // truncating.
      const model = registry ? findModel(registry, modelId) : null
      if (model?.context_length) {
        const projected = projectPromptTokens(messages) + estimateTokens(text)
        if (projected > model.context_length * 0.8) {
          await runCompaction()
        }
      }

      // After a possible compaction, re-read the in-memory list — it may
      // have new summary rows + stamped summarizedAt fields.
      const reloaded = conversations.currentId
        ? await listMessages(conversations.currentId)
        : messages
      setMessages(reloaded)

      const userRow = await addMessage({
        conversationId,
        role: "user",
        content: text,
      })

      const before = reloaded
      setMessages([...before, userRow])

      await streamAssistantTurn({
        conversationId,
        contextMessages: [...before, userRow],
        isFirstTurn: before.filter((m) => m.kind === "normal").length === 0,
        firstTurnText: text,
      })
    } finally {
      setStreaming(false)
    }
  }, [
    conversations,
    input,
    messages,
    modelId,
    registry,
    runCompaction,
    streaming,
    streamAssistantTurn,
  ])

  const regenerate = useCallback(
    async (assistantMessageId: string) => {
      if (streaming) return
      const idx = messages.findIndex((m) => m.id === assistantMessageId)
      if (idx === -1) return
      const target = messages[idx]
      if (!target) return
      // Walk back to the most recent user message preceding the target.
      const userIdx = (() => {
        for (let i = idx - 1; i >= 0; i--) {
          if (messages[i]?.role === "user") return i
        }
        return -1
      })()
      if (userIdx === -1) return

      setError(null)
      setStreaming(true)
      try {
        // Mark the target assistant + anything after as superseded — keeps
        // their cost rolling forward in the conversation total. The user
        // message we're regenerating against stays untouched.
        const supersededAt = Date.now()
        await markMessagesSupersededFrom(
          target.conversationId,
          target.createdAt,
        )
        const stamped = messages.map((m, i) =>
          i >= idx && m.supersededAt === null ? { ...m, supersededAt } : m,
        )
        setMessages(stamped)

        // Context for the new stream: everything up to (and including) the
        // user message — no superseded rows.
        const context = stamped
          .slice(0, idx)
          .filter((m) => m.supersededAt === null)
        await streamAssistantTurn({
          conversationId: target.conversationId,
          contextMessages: context,
          isFirstTurn: false,
        })
      } finally {
        setStreaming(false)
      }
    },
    [messages, streaming, streamAssistantTurn],
  )

  // ---- Triple-dot menu actions ----

  const submitRename = useCallback(
    async (id: string, next: string) => {
      setRenameTarget(null)
      const trimmed = next.trim()
      if (!trimmed) return
      await renameConversation(id, trimmed)
      await conversations.refresh()
    },
    [conversations],
  )

  const handleRegenerateTitle = useCallback(async () => {
    if (!currentConversation) return
    const msgs = await listMessages(currentConversation.id)
    const firstUser = msgs.find((m) => m.role === "user")
    const firstAssistant = msgs.find(
      (m) => m.role === "assistant" && m.status === "complete",
    )
    if (!firstUser || !firstAssistant) {
      Toast.show({ type: "error", text1: "Send a message first" })
      return
    }
    const title = await generateTitle({
      userMessage: firstUser.content,
      assistantResponse: firstAssistant.content,
    })
    if (!title) {
      Toast.show({ type: "error", text1: "Title generation failed" })
      return
    }
    await renameConversation(currentConversation.id, title)
    await conversations.refresh()
    Toast.show({ type: "success", text1: "Title regenerated" })
  }, [conversations, currentConversation])

  const handleToggleStar = useCallback(async () => {
    if (!currentConversation) return
    await conversations.setStarred(
      currentConversation.id,
      !currentConversation.starred,
    )
  }, [conversations, currentConversation])

  const handleDelete = useCallback(async () => {
    if (!currentConversation) return
    const ok = await confirm({
      title: "Delete chat?",
      message: currentConversation.title ?? "New chat",
      confirmLabel: "Delete",
      destructive: true,
    })
    if (ok) await conversations.remove(currentConversation.id)
  }, [confirm, conversations, currentConversation])

  const handleNewChat = useCallback(async () => {
    await conversations.startNew(modelId)
  }, [conversations, modelId])

  const renderItem = useCallback(
    ({ item, index }: { item: Message; index: number }) => {
      const isUser = item.role === "user"
      const usd =
        item.costUsd ??
        (typeof item.costCents === "number" ? item.costCents / 100 : null)
      // Show cost as soon as we have one — streaming rows now carry a live
      // estimate that ticks up with each token, snapping to the real OR
      // value on completion.
      const showCost = !isUser && usd != null
      const isErrored = item.status === "error"
      const showDividerAbove = item.id === dividerBeforeId

      if (isUser) {
        // SMS-style bubble — right-aligned, rounded, blue.
        return (
          <View className="gap-2.5">
            {showDividerAbove && <CompactedDivider />}
            <Pressable
              onLongPress={() => copyMessage(item.content)}
              delayLongPress={400}
              className="self-end max-w-[85%] rounded-[22px] bg-matcha-600 px-3.5 py-2 dark:bg-matcha-400"
            >
              <Text className="text-base text-white">{item.content}</Text>
            </Pressable>
          </View>
        )
      }

      // Assistant — Claude pattern. Content first, then action row +
      // optional version pagination, then the brand mark as a sign-off
      // stamp at the bottom (animated while streaming, static once done).
      const showActions = item.status === "complete" || item.status === "error"
      const isLastAssistant = index === lastAssistantIdx
      const isStreaming = item.status === "streaming"

      // Version-group lookup: if this assistant message has siblings (other
      // versions sharing the same anchor user message), surface the
      // pagination chip in the action row.
      const anchorId = anchorByAssistant.get(item.id)
      const versions = anchorId ? versionsByAnchor.get(anchorId) ?? [] : []
      const versionIdx = versions.findIndex((v) => v.id === item.id)
      const hasVersions = versions.length > 1 && versionIdx !== -1

      return (
        <View className="gap-1">
          {showDividerAbove && <CompactedDivider />}
          <View className="self-stretch gap-1.5 px-1">
            {item.content ? (
              <MarkdownText>{item.content}</MarkdownText>
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
                {item.modelId ? ` · ${shortModelName(item.modelId)}` : ""}
                {item.provider
                  ? ` · via ${providerLabel(item.provider)}`
                  : ""}
              </Text>
            )}
            {showActions && (
              <View className="flex-row items-center justify-between">
                <MessageActions
                  messageId={item.id}
                  content={item.content}
                  canRegenerate={isLastAssistant && !streaming}
                  onRegenerate={() => {
                    void regenerate(item.id)
                  }}
                />
                {hasVersions && (
                  <VersionPagination
                    current={versionIdx + 1}
                    total={versions.length}
                    onPrev={() => {
                      const prev = versions[versionIdx - 1]
                      if (prev) void switchVersion(item.id, prev.id)
                    }}
                    onNext={() => {
                      const next = versions[versionIdx + 1]
                      if (next) void switchVersion(item.id, next.id)
                    }}
                  />
                )}
              </View>
            )}
            {(item.content || isStreaming) && (
              <View className="-ml-0.5 mt-0.5">
                {isStreaming ? (
                  <BrewingMark size={20} />
                ) : (
                  <LogoMark size={20} />
                )}
              </View>
            )}
          </View>
        </View>
      )
    },
    [
      anchorByAssistant,
      brewingPhrase,
      copyMessage,
      dividerBeforeId,
      lastAssistantIdx,
      regenerate,
      streaming,
      switchVersion,
      versionsByAnchor,
    ],
  )

  return (
    <SafeAreaView
      className="flex-1 bg-chamomile-100 dark:bg-chamomile-900"
      edges={["top", "bottom"]}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-row items-center px-2 pb-2 pt-2">
          <Pressable
            onPress={sidebar.open}
            hitSlop={8}
            className="h-10 w-10 items-center justify-center rounded-md active:bg-zinc-100 dark:active:bg-zinc-800"
            accessibilityLabel="Open sidebar"
          >
            <IconMenu2
              size={24}
              color={dark ? "#f4f4f5" : "#18181b"}
              strokeWidth={1.75}
            />
          </Pressable>
          <View className="flex-1 items-center">
            <ModelSelector modelId={modelId} onChange={handleModelChange} />
          </View>
          <StorageToggle />
          <ChatActionsMenu
            conversation={currentConversation}
            onRename={() => {
              if (!currentConversation) return
              setRenameTarget({
                id: currentConversation.id,
                title: currentConversation.title,
              })
            }}
            onRegenerateTitle={() => {
              void handleRegenerateTitle()
            }}
            onToggleStar={() => {
              void handleToggleStar()
            }}
            onCompactNow={() => {
              void runCompaction()
            }}
            onDelete={handleDelete}
            onNewChat={() => {
              void handleNewChat()
            }}
          />
        </View>

        {!byok.ready ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
          </View>
        ) : !byok.hasOpenRouter ? (
          <NoKeyState />
        ) : (
          <>
            <FlatList
              ref={listRef}
              data={visibleMessages}
              keyExtractor={(m) => m.id}
              renderItem={renderItem}
              contentContainerClassName="grow gap-2.5 p-4"
              onContentSizeChange={() =>
                listRef.current?.scrollToEnd({ animated: true })
              }
              ListEmptyComponent={
                <View className="flex-1 items-center justify-center px-6 py-16">
                  <Text className="text-center text-zinc-500 dark:text-zinc-400">
                    Start a conversation. Messages stream in real time using
                    your OpenRouter key.
                  </Text>
                </View>
              }
            />

            {error && (
              <View className="bg-red-500/10 px-4 py-2">
                <Text className="text-sm text-red-600 dark:text-red-400">
                  error: {error}
                </Text>
              </View>
            )}

            <ChatStatusRow
              messages={messages}
              modelId={modelId}
              registry={registry ?? null}
              draft={input}
              onCompactNow={() => {
                void runCompaction()
              }}
            />

            <Composer
              value={input}
              onChange={setInput}
              onSend={send}
              streaming={streaming}
              dark={dark}
            />
          </>
        )}
      </KeyboardAvoidingView>

      <RenameDialog
        initial={renameTarget}
        onCancel={() => setRenameTarget(null)}
        onSubmit={submitRename}
      />
    </SafeAreaView>
  )
}

function shortModelName(id: string): string {
  return id.split("/").pop() ?? id
}

function providerLabel(provider: "openrouter" | "anthropic"): string {
  return provider === "anthropic" ? "Anthropic" : "OpenRouter"
}

/**
 * Composer pill — textarea on top, action row underneath. Mirrors the
 * design kit's `Composer`: full-width rounded-26 card, transparent
 * TextInput, [+] attachment button on the left, [mic] / [send-or-stop] on
 * the right. The send affordance is a round matcha button with an up-arrow;
 * while streaming it becomes a square stop button.
 */
function Composer({
  value,
  onChange,
  onSend,
  streaming,
  dark,
}: {
  value: string
  onChange: (next: string) => void
  onSend: () => void
  streaming: boolean
  dark: boolean
}) {
  const hasText = value.trim().length > 0
  const iconColor = dark ? "#e4e4e7" : "#3f3f46"
  return (
    <View className="border-t border-zinc-200 bg-chamomile-50 px-3 pb-2 pt-2 dark:border-zinc-800 dark:bg-chamomile-900">
      <View className="rounded-[26px] border border-zinc-200 bg-chamomile-50 px-2 pb-1.5 pt-2 dark:border-zinc-800 dark:bg-zinc-900">
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
          <Pressable
            hitSlop={6}
            accessibilityLabel="Add attachment"
            className="h-9 w-9 items-center justify-center rounded-full active:opacity-70"
          >
            <IconPlus size={20} color={iconColor} strokeWidth={1.75} />
          </Pressable>
          <View className="flex-row items-center gap-1">
            {!streaming && !hasText && (
              <Pressable
                hitSlop={6}
                accessibilityLabel="Voice"
                className="h-9 w-9 items-center justify-center rounded-full active:opacity-70"
              >
                <IconMicrophone size={18} color={iconColor} strokeWidth={1.75} />
              </Pressable>
            )}
            <Pressable
              onPress={streaming ? undefined : onSend}
              disabled={streaming ? false : !hasText}
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
    </View>
  )
}

/**
 * `< n/total >` pagination chip — appears in the action row when an
 * assistant turn has multiple regenerated versions. Lets the user step
 * back to an older variant. The corresponding DB write flips
 * supersededAt between versions so the visible-message filter stays
 * consistent.
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

/**
 * Local/cloud storage indicator. Visual-only for now — taps toggle the
 * icon. Wires to the conversation's userId field once cloud sync ships.
 */
function StorageToggle() {
  const [isCloud, setIsCloud] = useState(false)
  const dark = useColorScheme() === "dark"
  const Icon = isCloud ? IconCloud : IconDeviceMobile
  const tint = dark ? "#f4f4f5" : "#18181b"
  return (
    <Pressable
      onPress={() => setIsCloud((v) => !v)}
      hitSlop={8}
      accessibilityLabel={isCloud ? "Cloud storage" : "Local storage"}
      className="h-10 w-10 items-center justify-center rounded-md active:bg-zinc-100 dark:active:bg-zinc-800"
    >
      <Icon size={22} color={tint} strokeWidth={1.75} />
    </Pressable>
  )
}

function NoKeyState() {
  const dark = useColorScheme() === "dark"
  return (
    <View className="flex-1 items-center justify-center gap-4 px-8">
      <View className="h-14 w-14 items-center justify-center rounded-full bg-matcha-500/10">
        <IconKey
          size={28}
          color={dark ? "#8eb56b" : "#5b8a3a"}
          strokeWidth={1.75}
        />
      </View>
      <View className="gap-2">
        <Text className="text-center text-xl font-bold text-zinc-900 dark:text-zinc-100">
          Add an API key to start chatting
        </Text>
        <Text className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          Honest AI uses your own provider keys. They live encrypted on your
          device — we never see them.
        </Text>
      </View>
      <Button
        onPress={() => router.push("/byok" as never)}
        className="mt-2 min-w-[200px] bg-matcha-600 dark:bg-matcha-400"
      >
        Set up your keys
      </Button>
      <Text className="text-center text-xs text-zinc-500 dark:text-zinc-400">
        Recommended: a single OpenRouter key gives you access to every model.
      </Text>
    </View>
  )
}
