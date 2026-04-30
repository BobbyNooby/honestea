import { router } from "expo-router"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import {
  calculateCost,
  estimateTokens,
  formatCents,
  type Message,
} from "@honestea/shared"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChatStatusRow } from "@/components/chat-status-row"
import { ModelSelector } from "@/components/model-selector"
import { cn } from "@/lib/cn"
import { streamChat } from "@/lib/api"
import { useByokStatus } from "@/lib/byok"
import { useConversations } from "@/lib/conversations-context"
import {
  addMessage,
  listMessages,
  updateMessage,
} from "@/lib/db/repository"
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
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<FlatList<Message>>(null)

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

  const handleModelChange = useCallback(
    (next: string) => {
      setModelId(next)
      // Persist the switch so the picker defaults to it next time the user
      // returns to this conversation.
      void conversations.updateCurrentModel(next)
    },
    [conversations, setModelId],
  )

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming) return

    setError(null)
    setStreaming(true)
    setInput("")

    try {
      // Ensure there's a conversation to write into. Lazy-create on first send.
      const conversationId =
        conversations.currentId ?? (await conversations.startNew(modelId))

      const userRow = await addMessage({
        conversationId,
        role: "user",
        content: text,
      })

      const assistantRow = await addMessage({
        conversationId,
        role: "assistant",
        content: "",
        modelId,
        status: "streaming",
      })

      const before = messages
      const transcript = [...before, userRow, assistantRow]
      setMessages(transcript)

      let buffer = ""
      try {
        await streamChat({
          model: modelId,
          messages: [...before, userRow].map(({ role, content }) => ({
            role,
            content,
          })),
          onToken: (chunk) => {
            buffer += chunk
            setMessages((m) =>
              m.map((msg) =>
                msg.id === assistantRow.id ? { ...msg, content: buffer } : msg,
              ),
            )
          },
        })

        const cost = estimateAssistantCost({
          registry: registry ?? null,
          modelId,
          history: [...before, userRow],
          completion: buffer,
        })

        const promptTokens = estimateTokens(
          [...before, userRow].map((m) => m.content).join("\n"),
        )
        const completionTokens = estimateTokens(buffer)

        await updateMessage(assistantRow.id, {
          content: buffer,
          status: "complete",
          modelId,
          promptTokens,
          completionTokens,
          costCents: cost ?? null,
        })

        setMessages((m) =>
          m.map((msg) =>
            msg.id === assistantRow.id
              ? {
                  ...msg,
                  content: buffer,
                  status: "complete",
                  costCents: cost ?? null,
                  promptTokens,
                  completionTokens,
                }
              : msg,
          ),
        )
      } catch (e) {
        const errorText = e instanceof Error ? e.message : "unknown error"
        setError(errorText)
        await updateMessage(assistantRow.id, {
          content: buffer,
          status: "error",
        })
        setMessages((m) =>
          m.map((msg) =>
            msg.id === assistantRow.id
              ? { ...msg, content: buffer, status: "error" }
              : msg,
          ),
        )
      }
    } finally {
      setStreaming(false)
    }
  }, [conversations, input, messages, modelId, registry, streaming])

  const renderItem = useCallback(
    ({ item }: { item: Message }) => {
      const isUser = item.role === "user"
      const showCost =
        !isUser && typeof item.costCents === "number" && item.status === "complete"
      const isErrored = item.status === "error"
      return (
        <View
          className={cn(
            "max-w-[88%] gap-1 rounded-lg p-3",
            isUser
              ? "self-end bg-blue-500"
              : "self-start bg-zinc-100 dark:bg-zinc-800",
            isErrored && "border border-red-500/40",
          )}
        >
          <Text
            className={cn(
              "text-[10px] uppercase tracking-wider opacity-60",
              isUser ? "text-white" : "text-zinc-700 dark:text-zinc-300",
            )}
          >
            {isUser ? "you" : "assistant"}
            {isErrored ? " · errored" : ""}
          </Text>
          <Text
            className={cn(
              "text-base",
              isUser ? "text-white" : "text-zinc-900 dark:text-zinc-100",
            )}
          >
            {item.content ||
              (item.role === "assistant" && item.status === "streaming"
                ? "…"
                : "")}
          </Text>
          {showCost && (
            <Text className="text-[10px] text-zinc-500 dark:text-zinc-400">
              ~{formatCents(item.costCents ?? 0)}
              {item.modelId ? ` · ${shortModelName(item.modelId)}` : ""}
            </Text>
          )}
        </View>
      )
    },
    [],
  )

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-zinc-950" edges={["top"]}>
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
            <Text className="text-2xl text-zinc-900 dark:text-zinc-100">☰</Text>
          </Pressable>
          <View className="flex-1 items-center">
            <ModelSelector modelId={modelId} onChange={handleModelChange} />
          </View>
          <View className="h-10 w-10" />
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
              data={messages}
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
            />

            <View className="flex-row items-end gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800">
              <Input
                value={input}
                onChangeText={setInput}
                placeholder="Send a message…"
                multiline
                editable={!streaming}
                onSubmitEditing={send}
                returnKeyType="send"
                className="max-h-32 flex-1"
              />
              <Button
                onPress={send}
                disabled={streaming || !input.trim()}
                loading={streaming}
                className="min-w-[72px]"
              >
                send
              </Button>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function shortModelName(id: string): string {
  return id.split("/").pop() ?? id
}

function estimateAssistantCost({
  registry,
  modelId,
  history,
  completion,
}: {
  registry: readonly RegistryModel[] | null
  modelId: string
  history: { content: string }[]
  completion: string
}): number | undefined {
  if (!registry) return undefined
  const model = findModel(registry, modelId)
  if (!model) return undefined

  const promptText = history.map((m) => m.content).join("\n")
  const usage = {
    promptTokens: estimateTokens(promptText),
    completionTokens: estimateTokens(completion),
  }
  return calculateCost(pricingFor(model), usage).totalCents
}

function NoKeyState() {
  return (
    <View className="flex-1 items-center justify-center gap-4 px-8">
      <View className="h-14 w-14 items-center justify-center rounded-full bg-blue-500/10">
        <Text className="text-2xl">🔑</Text>
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
        className="mt-2 min-w-[200px]"
      >
        Set up your keys
      </Button>
      <Text className="text-center text-xs text-zinc-500 dark:text-zinc-400">
        Recommended: a single OpenRouter key gives you access to every model.
      </Text>
    </View>
  )
}
