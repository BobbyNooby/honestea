import { router } from "expo-router"
import { useCallback, useRef, useState } from "react"
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
} from "@honestea/shared"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/cn"
import { streamChat, type ChatMessage } from "@/lib/api"
import { useByokStatus } from "@/lib/byok"
import {
  findModel,
  pricingFor,
  useModelRegistry,
  type RegistryModel,
} from "@/lib/model-registry"
import { useSidebar } from "@/lib/sidebar-context"

const DEFAULT_MODEL = "minimax/minimax-m2.5"

interface UiMessage extends ChatMessage {
  id: string
  costCents?: number
  model?: string
}

export default function ChatScreen() {
  const sidebar = useSidebar()
  const byok = useByokStatus()
  const { registry } = useModelRegistry()
  const [messages, setMessages] = useState<UiMessage[]>([])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<FlatList<UiMessage>>(null)

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming) return

    setError(null)
    const userMsg: UiMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    }
    const assistantMsg: UiMessage = {
      id: `a-${Date.now()}`,
      role: "assistant",
      content: "",
    }
    const conversation = [...messages, userMsg]
    setMessages([...conversation, assistantMsg])
    setInput("")
    setStreaming(true)

    try {
      let buffer = ""
      await streamChat({
        model: DEFAULT_MODEL,
        messages: conversation.map(({ role, content }) => ({ role, content })),
        onToken: (chunk) => {
          buffer += chunk
          setMessages((m) =>
            m.map((msg) =>
              msg.id === assistantMsg.id ? { ...msg, content: buffer } : msg,
            ),
          )
        },
      })
      // Once the stream finishes, estimate cost from input + output sizes.
      const cost = estimateAssistantCost({
        registry: registry ?? null,
        modelId: DEFAULT_MODEL,
        conversation,
        completion: buffer,
      })
      setMessages((m) =>
        m.map((msg) =>
          msg.id === assistantMsg.id
            ? { ...msg, costCents: cost, model: DEFAULT_MODEL }
            : msg,
        ),
      )
    } catch (e) {
      const errorText = e instanceof Error ? e.message : "unknown error"
      setError(errorText)
      setMessages((m) =>
        m.map((msg) =>
          msg.id === assistantMsg.id
            ? { ...msg, content: `[error: ${errorText}]` }
            : msg,
        ),
      )
    } finally {
      setStreaming(false)
    }
  }, [input, messages, streaming])

  const renderItem = useCallback(
    ({ item }: { item: UiMessage }) => {
      const isUser = item.role === "user"
      return (
        <View
          className={cn(
            "max-w-[88%] gap-1 rounded-lg p-3",
            isUser ? "self-end bg-blue-500" : "self-start bg-zinc-100 dark:bg-zinc-800",
          )}
        >
          <Text
            className={cn(
              "text-[10px] uppercase tracking-wider opacity-60",
              isUser ? "text-white" : "text-zinc-700 dark:text-zinc-300",
            )}
          >
            {isUser ? "you" : "assistant"}
          </Text>
          <Text
            className={cn(
              "text-base",
              isUser ? "text-white" : "text-zinc-900 dark:text-zinc-100",
            )}
          >
            {item.content || (item.role === "assistant" && streaming ? "…" : "")}
          </Text>
          {!isUser && typeof item.costCents === "number" && (
            <Text className="text-[10px] text-zinc-500 dark:text-zinc-400">
              ~{formatCents(item.costCents)}
              {item.model ? ` · ${shortModelName(item.model)}` : ""}
            </Text>
          )}
        </View>
      )
    },
    [streaming],
  )

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-zinc-950" edges={["top"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-row items-center gap-3 px-3 pb-2 pt-2">
          <Pressable
            onPress={sidebar.open}
            hitSlop={8}
            className="h-10 w-10 items-center justify-center rounded-md active:bg-zinc-100 dark:active:bg-zinc-800"
            accessibilityLabel="Open sidebar"
          >
            <Text className="text-2xl text-zinc-900 dark:text-zinc-100">☰</Text>
          </Pressable>
          <View className="flex-1">
            <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Honest AI
            </Text>
            <Text className="text-xs text-zinc-500 dark:text-zinc-400">
              {DEFAULT_MODEL}
            </Text>
          </View>
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
  conversation,
  completion,
}: {
  registry: readonly RegistryModel[] | null
  modelId: string
  conversation: UiMessage[]
  completion: string
}): number | undefined {
  if (!registry) return undefined
  const model = findModel(registry, modelId)
  if (!model) return undefined

  const promptText = conversation.map((m) => m.content).join("\n")
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
