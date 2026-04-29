import { useCallback, useRef, useState } from "react"
import { FlatList, KeyboardAvoidingView, Platform, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/cn"
import { streamChat, type ChatMessage } from "@/lib/api"

const DEFAULT_MODEL = "minimax/minimax-m2.5"

interface UiMessage extends ChatMessage {
  id: string
}

export default function ChatScreen() {
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
        <View className="px-5 pb-2 pt-3">
          <Text className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            Honest AI
          </Text>
          <Text className="text-xs text-zinc-500 dark:text-zinc-400">
            {DEFAULT_MODEL}
          </Text>
        </View>

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
                Start a conversation. Messages stream in real time from
                OpenRouter.
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
