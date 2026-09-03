import { IconMenu2 } from "@tabler/icons-react-native"
import * as Clipboard from "expo-clipboard"
import * as Haptics from "expo-haptics"
import { Redirect } from "expo-router"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  useColorScheme,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import Toast from "react-native-toast-message"

import {
  estimateTokens,
  type Attachment,
  type Message,
  type PersistedToolCall,
} from "@honestea/shared"

import { ChatActionsMenu } from "@/components/chat/chat-actions-menu"
import { ChatMessage } from "@/components/chat/chat-message"
import { ChatStatusRow } from "@/components/chat/chat-status-row"
import { EmptyChatState } from "@/components/chat/empty-chat-state"
import { NoKeyState } from "@/components/chat/no-key-state"
import { ScrollToBottom } from "@/components/chat/scroll-to-bottom"
import { Composer } from "@/components/composer/composer"
import { type ResponseStyle } from "@/components/composer/compose-menu"
import { ModelSelector } from "@/components/model-selector"
import { RenameDialog } from "@/components/ui/rename-dialog"
import { streamChat } from "@/lib/api"
import type {
  ChatMessage as ApiChatMessage,
  ToolCallEvent,
} from "@/lib/api/types"
import {
  buildMessageContent,
  compact,
  generateTitle,
  projectPromptTokens,
  styleSystemPrompt,
  useBrewingPhrase,
} from "@/lib/chat"
import { useByokStatus } from "@/lib/byok"
import { useKeyHealth } from "@/lib/byok/key-health"
import { useConfirm } from "@/lib/confirm-context"
import { useConversations } from "@/lib/conversations-context"
import {
  addMessage,
  listMessages,
  markMessagesSupersededFrom,
  recordUsageEvent,
  renameConversation,
  setMessageSupersededAt,
  updateMessage,
} from "@/lib/db/repository"
import {
  findModel,
  pricingFor,
  useModelRegistry,
  useSelectedModel,
} from "@/lib/model"
import { useNetworkStatus } from "@/lib/network"
import { useOnboardingSeen } from "@/lib/onboarding-state"
import { useSidebar } from "@/lib/sidebar-context"

export default function ChatScreen() {
  // First-launch gate. While the flag is loading we render nothing —
  // beats flashing the empty chat for a frame before the redirect kicks
  // in. Once seen, falls through to the normal chat tree.
  const onboardingSeen = useOnboardingSeen()
  if (onboardingSeen === false) return <Redirect href={"/onboarding" as never} />
  if (onboardingSeen === null) return null
  return <ChatScreenInner />
}

function ChatScreenInner() {
  const sidebar = useSidebar()
  const byok = useByokStatus()
  const { health: keyHealth, recheck: recheckKeyHealth } = useKeyHealth()
  const { registry, isStale } = useModelRegistry()
  const network = useNetworkStatus()

  // Re-validate the key when the app regains connectivity.
  const wasOfflineRef = useRef(false)
  useEffect(() => {
    if (!network.checking && !network.isConnected) {
      wasOfflineRef.current = true
    } else if (wasOfflineRef.current && network.isConnected) {
      wasOfflineRef.current = false
      recheckKeyHealth()
    }
  }, [network.isConnected, network.checking, recheckKeyHealth])
  const { modelId, setModelId } = useSelectedModel()
  const conversations = useConversations()
  const confirm = useConfirm()
  const dark = useColorScheme() === "dark"
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [compacting, setCompacting] = useState(false)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  // Phrase rotates ~every 2.2s while the hook is active. Gate on
  // `streaming` so the entire chat screen doesn't re-render on a timer
  // when nothing's happening.
  const brewingPhrase = useBrewingPhrase(streaming)
  const [error, setError] = useState<string | null>(null)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  // Compose-menu controls. Web search rides on OR's `openrouter:web_search`
  // server tool — defaults on (the model decides 0-N searches per turn,
  // so a search only runs when the question actually benefits from it).
  // Gated on tool-calling support: when the active model can't use tools
  // the toggle stays visually disabled and no search is sent.
  const [webSearch, setWebSearch] = useState(true)
  const [responseStyle, setResponseStyle] = useState<ResponseStyle>("normal")
  // Attachments queued for the next send. Cleared after the user message
  // row is written to the DB. Composer renders chips for each.
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([])

  // Live tool-call activity per assistant message id. Populated from the
  // OR streamer's onToolEvent callback while a turn is streaming;
  // cleared on completion (citations chip + answer text take over).
  // Map<messageId, Map<callIndex, ToolCallEvent>>.
  const [toolActivity, setToolActivity] = useState<
    Map<string, Map<number, ToolCallEvent>>
  >(new Map())

  // Whether the current model supports OR's tool calling (and therefore
  // the web_search server tool). The compose menu greys the toggle and
  // the composer hides the Web pill when this is false.
  const webSearchSupported = useMemo(() => {
    if (!registry) return false
    const model = findModel(registry, modelId)
    return model?.supported_parameters?.includes("tools") ?? false
  }, [registry, modelId])

  // Whether the current model accepts image input. Drives whether the
  // compose menu's "Add image" / "Take photo" rows are tappable. Read
  // from the OR registry's `architecture.input_modalities`.
  const imageSupported = useMemo(() => {
    if (!registry) return false
    const model = findModel(registry, modelId)
    return model?.architecture?.input_modalities?.includes("image") ?? false
  }, [registry, modelId])

  // Whether the current model accepts file (PDF) input. Drives whether
  // the compose menu's "Add file" row is tappable. Gated on the OR
  // registry's `architecture.input_modalities` — models that include
  // "file" get `type: "file"` content blocks sent directly through OR.
  const fileSupported = useMemo(() => {
    if (!registry) return false
    const model = findModel(registry, modelId)
    return model?.architecture?.input_modalities?.includes("file") ?? false
  }, [registry, modelId])
  const [renameTarget, setRenameTarget] = useState<{
    id: string
    title: string | null
  } | null>(null)
  const listRef = useRef<FlatList<Message>>(null)

  // ── In-flight stream bookkeeping ──
  // streamingRef mirrors `streaming` synchronously so the send gate can't
  // be double-fired inside one render frame (state updates are async).
  const streamingRef = useRef(false)
  // AbortController for the current stream. The composer's stop button
  // (and conversation switches / unmount) abort it.
  const abortRef = useRef<AbortController | null>(null)
  // True when the abort came from the stop button (vs a conversation
  // switch) — only then do we toast.
  const manualStopRef = useRef(false)
  // Mirror of conversations.currentId so async completions can compare
  // against what's on screen without stale closures.
  const currentIdRef = useRef(conversations.currentId)
  useEffect(() => {
    currentIdRef.current = conversations.currentId
  }, [conversations.currentId])

  const stopStreaming = useCallback(() => {
    if (!abortRef.current) return
    manualStopRef.current = true
    abortRef.current.abort()
  }, [])

  const scrollToBottom = useCallback(() => {
    listRef.current?.scrollToEnd({ animated: true })
  }, [])

  // Show the scroll-to-bottom FAB when the user has scrolled more than ~3
  // rows (150pt) away from the bottom. Hide when near the bottom.
  const handleScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number }; contentSize: { height: number }; layoutMeasurement: { height: number } } }) => {
      const { y } = e.nativeEvent.contentOffset
      const { height: contentH } = e.nativeEvent.contentSize
      const { height: layoutH } = e.nativeEvent.layoutMeasurement
      if (contentH === 0) return
      const distFromBottom = contentH - y - layoutH
      setShowScrollBtn(distFromBottom > 150)
    },
    [],
  )

  const currentConversation = useMemo(
    () =>
      conversations.conversations.find(
        (c) => c.id === conversations.currentId,
      ) ?? null,
    [conversations.conversations, conversations.currentId],
  )

  // Visible rows: everything except superseded-by-regenerate. Summarized
  // messages and summary rows both render — the visual history is the
  // source of truth. Only superseded rows (older versions of a
  // regenerated turn) are hidden.
  const visibleMessages = useMemo(
    () => messages.filter((m) => m.supersededAt === null),
    [messages],
  )

  // First chronological message id that has a compacted-summary row
  // before it. We render a divider above it. Null when no compaction
  // has occurred yet.
  const dividerBeforeId = useMemo(() => {
    const summaryIdx = messages.findIndex((m) => m.kind === "summary")
    if (summaryIdx === -1) return null
    // The divider goes above the first non-summary message after the
    // summary row.
    for (let i = summaryIdx + 1; i < messages.length; i++) {
      if (messages[i].supersededAt === null) return messages[i].id
    }
    return null
  }, [messages])

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
    // A stream in flight owns the message list — its optimistic updates
    // would be clobbered by a stale reload (this is exactly the window
    // `send` creates a conversation in).
    if (streamingRef.current) return
    let cancelled = false
    listMessages(conversations.currentId).then((rows) => {
      if (!cancelled) setMessages(rows)
    })
    return () => {
      cancelled = true
      // Switching away from a conversation mid-stream stops the stream.
      // The catch path keeps the partial reply, so nothing is lost.
      abortRef.current?.abort()
    }
  }, [conversations.currentId])

  // Android: KeyboardAvoidingView leaks residual padding after keyboard dismiss.
  // Track height ourselves and apply it to a plain View instead.
  useEffect(() => {
    if (Platform.OS !== "android") return
    const show = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height)
    })
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0)
    })
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])

  /**
   * Run a compaction pass against the current conversation. Returns true
   * on success so callers (pre-send, manual button) can decide whether to
   * proceed or bail. Toasts feedback either way.
   */
  const runCompaction = useCallback(async (): Promise<boolean> => {
    if (!conversations.currentId) return false
    const model = registry ? findModel(registry, modelId) : null
    if (!model?.context_length) return false
    setCompacting(true)
    try {
      const fresh = await listMessages(conversations.currentId)
      const result = await compact({
        conversationId: conversations.currentId,
        messages: fresh,
        modelContextLength: model.context_length,
        summarizeModel: modelId,
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
        text1: `Compacted ${result.summarizedCount} message${result.summarizedCount === 1 ? "" : "s"}`,
      })
      const refreshed = await listMessages(conversations.currentId)
      setMessages(refreshed)
      return true
    } catch (e) {
      Toast.show({
        type: "error",
        text1: "Compaction failed",
        text2: e instanceof Error ? e.message : "unknown error",
      })
      return false
    } finally {
      setCompacting(false)
    }
  }, [conversations.currentId, modelId, registry])

  const handleModelChange = useCallback(
    async (next: string) => {
      setModelId(next)
      void conversations.updateCurrentModel(next)
      // If the new model has a smaller context window AND we're already
      // over 80% of it, auto-compact on switch instead of letting the user
      // hit a wall on their next send. Never mid-stream — the compaction
      // stream would race the chat stream.
      const newModel = registry ? findModel(registry, next) : null
      if (newModel?.context_length && !streamingRef.current) {
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
      /** Whether to enable OR's web_search server tool for this turn.
       *  Captured as a snapshot of the toggle at request time so toggling
       *  it off mid-stream doesn't cancel an in-flight search. */
      webSearch: boolean
      /** Response style snapshot — drives the system-prompt prefix. */
      style: ResponseStyle
    }) => {
      const {
        conversationId,
        contextMessages,
        isFirstTurn,
        firstTurnText,
        webSearch,
        style,
      } = params

      const controller = new AbortController()
      abortRef.current = controller

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

      // Build the request-side message list. For each visible message,
      // construct content blocks if it carries attachments — otherwise
      // pass plain text. Resolved sequentially because reading
      // attachment files is async (FileSystem.readAsStringAsync).
      const apiMessages: ApiChatMessage[] = []
      const styleDirective = styleSystemPrompt(style)
      if (styleDirective) {
        // Style prompt rides as a system message in front of the
        // conversation. Lives in the request only — never written to
        // the DB — so the user can swap styles between turns and the
        // same history applies cleanly under whichever directive.
        apiMessages.push({ role: "system", content: styleDirective })
      }

      // ── Conversation history context ──
      // Deliberately absent: the old per-send LLM intent-classifier.
      // It cost a paid API call and 1–2s of latency on EVERY message.
      // Cross-conversation context is available on demand via sidebar
      // search instead.

      for (const m of visibleContext) {
        const content = await buildMessageContent(m.content, m.attachments)
        apiMessages.push({ role: m.role, content })
      }

      let buffer = ""
      // Local snapshot of tool calls for this turn. Mirrors the React
      // state so we can serialize it at completion without racing the
      // setState batcher.
      const turnToolCalls = new Map<number, ToolCallEvent>()
      try {
        const result = await streamChat({
          model: modelId,
          messages: apiMessages,
          webSearch,
          signal: controller.signal,
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
          onToolEvent: (event) => {
            turnToolCalls.set(event.index, event)
            // Update the per-message tool-call map. We mutate via
            // replacement to keep React's identity-based equality
            // happy. Indexed by call.index so the same call updating
            // its phase/args overwrites in place.
            setToolActivity((prev) => {
              const next = new Map(prev)
              const forMsg = new Map(next.get(assistantRow.id) ?? [])
              forMsg.set(event.index, event)
              next.set(assistantRow.id, forMsg)
              return next
            })
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

        // Persist citations as null when the model didn't search — keeps
        // the "🌐 N sources" chip from rendering on plain replies that
        // happened to have web search enabled.
        const citations =
          result.citations.length > 0 ? result.citations : null

        // Snapshot tool calls (web_search/web_fetch/datetime) so the
        // expandable history panel can replay them on past turns. Null
        // when no tools ran — keeps the panel hidden on plain replies.
        const persistedToolCalls: PersistedToolCall[] | null =
          turnToolCalls.size > 0
            ? [...turnToolCalls.values()]
                .sort((a, b) => a.index - b.index)
                .map((c) => ({ name: c.name, args: c.args }))
            : null

        await updateMessage(assistantRow.id, {
          content: buffer,
          status: "complete",
          modelId,
          promptTokens,
          completionTokens,
          costUsd,
          provider: result.provider,
          citations,
          toolCalls: persistedToolCalls,
        })

        // Append to the immutable usage ledger. Survives chat
        // deletion — the savings card on /usage aggregates from this,
        // not from `messages`, so lifetime totals stay accurate even
        // if the user later deletes this conversation.
        void recordUsageEvent({
          modelId,
          provider: result.provider,
          promptTokens,
          completionTokens,
          costUsd: costUsd ?? 0,
          messageId: assistantRow.id,
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
                  citations,
                  toolCalls: persistedToolCalls,
                }
              : msg,
          ),
        )
        // Live activity panel hands off to the persisted history panel
        // backed by `message.toolCalls`. Drop the live entry so we don't
        // double-render.
        setToolActivity((prev) => {
          if (!prev.has(assistantRow.id)) return prev
          const next = new Map(prev)
          next.delete(assistantRow.id)
          return next
        })

        if (isFirstTurn && firstTurnText) {
          void generateTitle({
            userMessage: firstTurnText,
            assistantResponse: buffer,
            titleModel: modelId,
          }).then(async (title) => {
            if (!title) return
            await renameConversation(conversationId, title)
            await conversations.refresh()
          })
        }
      } catch (e) {
        // Stopped — by the stop button, a conversation switch, or
        // unmount. Keep the partial reply (it's real output the user
        // saw streaming), finalize as complete so the launch-time sweep
        // doesn't mark it as an error, and account for the tokens we
        // already spent.
        const aborted =
          controller.signal.aborted ||
          (e instanceof Error && e.name === "AbortError")
        if (aborted) {
          const partialCostUsd = liveCostFor(buffer)
          await updateMessage(assistantRow.id, {
            content: buffer,
            status: "complete",
            costUsd: partialCostUsd,
            completionTokens: estimateTokens(buffer),
          })
          setMessages((m) =>
            m.map((msg) =>
              msg.id === assistantRow.id
                ? {
                    ...msg,
                    content: buffer,
                    status: "complete",
                    costUsd: partialCostUsd,
                  }
                : msg,
            ),
          )
          setToolActivity((prev) => {
            if (!prev.has(assistantRow.id)) return prev
            const next = new Map(prev)
            next.delete(assistantRow.id)
            return next
          })
          if (manualStopRef.current) {
            Toast.show({ type: "info", text1: "Stopped", visibilityTime: 1500 })
          }
          return
        }

        const raw = e instanceof Error ? e.message : "unknown error"
        const errorText = isNetworkError(raw)
          ? "No internet connection. Check your network and try again."
          : raw
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
        setToolActivity((prev) => {
          if (!prev.has(assistantRow.id)) return prev
          const next = new Map(prev)
          next.delete(assistantRow.id)
          return next
        })
      } finally {
        if (abortRef.current === controller) abortRef.current = null
        manualStopRef.current = false
      }
    },
    [conversations, modelId, registry],
  )

  const send = useCallback(async () => {
    const text = input.trim()
    // Allow sending when text is empty BUT attachments are present —
    // common for "what's in this picture?" style turns.
    // streamingRef (not the `streaming` state) is the gate: state updates
    // are async, so two taps in one frame would both see `streaming === false`.
    if ((!text && pendingAttachments.length === 0) || streamingRef.current) return
    streamingRef.current = true

    // Refuse to send incompatible attachments to a model that can't
    // accept them — would otherwise hit the API and fail with a noisy
    // 4xx. The composer banner already warns; this is the actual gate.
    const hasImageAttachments = pendingAttachments.some(
      (a) => a.kind === "image",
    )
    const hasFileAttachments = pendingAttachments.some(
      (a) => a.kind === "file",
    )
    if (hasImageAttachments && !imageSupported) {
      Toast.show({
        type: "error",
        text1: "Model doesn't accept images",
        text2: "Switch to a vision-capable model or remove the attachment.",
      })
      return
    }
    if (hasFileAttachments && !fileSupported) {
      Toast.show({
        type: "error",
        text1: "Model doesn't accept files",
        text2:
          "Switch to a file-capable model or remove the PDF attachment.",
      })
      return
    }

    setError(null)
    setStreaming(true)
    setInput("")
    // Capture attachments before clearing — used for the user row's
    // `attachments` column, then cleared from the composer.
    const sendAttachments =
      pendingAttachments.length > 0 ? pendingAttachments : null
    setPendingAttachments([])

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
      // have new summary rows + stamped summarizedAt fields. Always keyed
      // on the resolved conversationId: `conversations.currentId` is a
      // stale closure value here (null on a brand-new chat, or pointing
      // at the PREVIOUS conversation), which used to seed a new chat with
      // the wrong history.
      const reloaded = await listMessages(conversationId)
      setMessages(reloaded)

      const userRow = await addMessage({
        conversationId,
        role: "user",
        content: text,
        attachments: sendAttachments,
      })

      const before = reloaded
      setMessages([...before, userRow])

      await streamAssistantTurn({
        conversationId,
        contextMessages: [...before, userRow],
        isFirstTurn: before.filter((m) => m.kind === "normal").length === 0,
        firstTurnText: text,
        webSearch,
        style: responseStyle,
      })
    } finally {
      streamingRef.current = false
      setStreaming(false)
      // If the user switched conversations while we were streaming, the
      // switch-abort already finalized the old stream — resync the list
      // to whatever is on screen now.
      if (currentIdRef.current !== null) {
        const fresh = await listMessages(currentIdRef.current)
        setMessages(fresh)
      } else {
        setMessages([])
      }
    }
  }, [
    conversations,
    fileSupported,
    imageSupported,
    input,
    messages,
    modelId,
    pendingAttachments,
    registry,
    responseStyle,
    runCompaction,
    streaming,
    streamAssistantTurn,
    webSearch,
  ])

  const regenerate = useCallback(
    async (assistantMessageId: string) => {
      if (streamingRef.current) return
      streamingRef.current = true
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
          webSearch,
          style: responseStyle,
        })
      } finally {
        streamingRef.current = false
        setStreaming(false)
      }
    },
    [messages, responseStyle, streaming, streamAssistantTurn, webSearch],
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
      titleModel: modelId,
    })
    if (!title) {
      Toast.show({ type: "error", text1: "Title generation failed" })
      return
    }
    await renameConversation(currentConversation.id, title)
    await conversations.refresh()
    Toast.show({ type: "success", text1: "Title regenerated" })
  }, [conversations, currentConversation, modelId])

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
      const anchorId = anchorByAssistant.get(item.id)
      const versions = anchorId ? versionsByAnchor.get(anchorId) ?? [] : []
      const versionIdx = versions.findIndex((v) => v.id === item.id)
      const calls = toolActivity.get(item.id)
      return (
        <ChatMessage
          message={item}
          isLastAssistant={index === lastAssistantIdx}
          showDividerAbove={item.id === dividerBeforeId}
          brewingPhrase={brewingPhrase}
          globallyStreaming={streaming}
          versions={versions}
          versionIdx={versionIdx}
          toolCalls={calls ? [...calls.values()] : undefined}
          onCopyText={copyMessage}
          onRegenerate={(id) => {
            void regenerate(id)
          }}
          onSwitchVersion={(oldId, newId) => {
            void switchVersion(oldId, newId)
          }}
        />
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
      toolActivity,
      versionsByAnchor,
    ],
  )

  const body = (
    <>
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
            {!network.isConnected && !network.checking && (
              <View className="mt-0.5 flex-row items-center gap-1">
                <View className="h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                <Text className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  Offline
                </Text>
              </View>
            )}
          </View>
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
            compacting={compacting}
            onDelete={handleDelete}
            onNewChat={() => {
              void handleNewChat()
            }}
          />
        </View>

        {!network.isConnected && !network.checking && (
          <View className="mx-4 mb-2 rounded-lg bg-amber-500/10 px-3 py-1.5">
            <Text className="text-center text-xs text-amber-700 dark:text-amber-400">
              📶 Offline — using cached models. Prices and capabilities may
              be stale.
            </Text>
          </View>
        )}

        {keyHealth.status === "invalid" && (
          <View className="mx-4 mb-2 rounded-lg bg-red-500/10 px-3 py-1.5">
            <Text className="text-center text-xs text-red-700 dark:text-red-400">
              🔑 Key invalid — check API Keys in settings.
            </Text>
          </View>
        )}

        {keyHealth.status === "depleted" && (
          <View className="mx-4 mb-2 rounded-lg bg-red-500/10 px-3 py-1.5">
            <Text className="text-center text-xs text-red-700 dark:text-red-400">
              🔑 Key depleted — add credits at openrouter.ai/credits.
            </Text>
          </View>
        )}

        {keyHealth.status === "low_balance" && (
          <View className="mx-4 mb-2 rounded-lg bg-amber-500/10 px-3 py-1.5">
            <Text className="text-center text-xs text-amber-700 dark:text-amber-400">
              🔑 Key balance low — you are within 20% of your limit.
            </Text>
          </View>
        )}

        {!byok.ready ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
          </View>
        ) : !byok.hasOpenRouter ? (
          <NoKeyState />
        ) : (
          <>
            <View className="relative flex-1">
              <FlatList
                ref={listRef}
                data={visibleMessages}
                keyExtractor={(m) => m.id}
                renderItem={renderItem}
                contentContainerClassName="grow gap-2.5 p-4"
                onContentSizeChange={() => {
                  if (!showScrollBtn) {
                    listRef.current?.scrollToEnd({ animated: true })
                  }
                }}
                onScroll={handleScroll}
                scrollEventThrottle={200}
                ListEmptyComponent={<EmptyChatState />}
              />
              <ScrollToBottom visible={showScrollBtn} onPress={scrollToBottom} />
            </View>

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
              compacting={compacting}
              onCompactNow={() => {
                void runCompaction()
              }}
            />

            <Composer
              value={input}
              onChange={setInput}
              onSend={send}
              streaming={streaming}
              onStop={stopStreaming}
              disabled={compacting}
              dark={dark}
              webSearch={webSearch}
              onToggleWebSearch={setWebSearch}
              webSearchSupported={webSearchSupported}
              style={responseStyle}
              onChangeStyle={setResponseStyle}
              attachments={pendingAttachments}
              onAttachmentsChange={setPendingAttachments}
              imageSupported={imageSupported}
              fileSupported={fileSupported}
            />
          </>
        )}
    </>
  )

  return (
    <SafeAreaView
      className="flex-1 bg-chamomile-100 dark:bg-chamomile-900"
      edges={["top", "bottom"]}
    >
      {Platform.OS === "ios" ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          {body}
        </KeyboardAvoidingView>
      ) : (
        <View style={{ flex: 1, paddingBottom: keyboardHeight }}>
          {body}
        </View>
      )}

      <RenameDialog
        initial={renameTarget}
        onCancel={() => setRenameTarget(null)}
        onSubmit={submitRename}
      />
    </SafeAreaView>
  )
}

function isNetworkError(message: string): boolean {
  // Note: AbortError is handled explicitly before this — "abort" here
  // would misreport a stopped stream as an offline error.
  return /network|fetch|timeout|connection|offline|internet|failed to fetch|could not connect/i.test(
    message,
  )
}
