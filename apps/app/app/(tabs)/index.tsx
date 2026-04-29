import { useCallback, useRef, useState } from "react"
import { FlatList, KeyboardAvoidingView, Platform, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ThemedText } from "@/components/themed-text"
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
        <Card
          className={cn(
            "max-w-[88%] gap-1",
            isUser
              ? "self-end border-0 bg-primary"
              : "self-start bg-secondary",
          )}
        >
          <ThemedText
            className={cn(
              "text-[10px] uppercase tracking-wider opacity-60",
              isUser ? "text-primary-foreground" : "text-secondary-foreground",
            )}
          >
            {isUser ? "you" : "assistant"}
          </ThemedText>
          <CardContent
            className={isUser ? "text-primary-foreground" : "text-secondary-foreground"}
          >
            {item.content || (item.role === "assistant" && streaming ? "…" : "")}
          </CardContent>
        </Card>
      )
    },
    [streaming],
  )

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="px-5 pb-2 pt-3">
          <ThemedText type="title">Honest AI</ThemedText>
          <ThemedText className="text-xs opacity-55">{DEFAULT_MODEL}</ThemedText>
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
              <ThemedText className="text-center opacity-55">
                Start a conversation. Messages stream in real time from
                OpenRouter.
              </ThemedText>
            </View>
          }
        />

        {error && (
          <View className="bg-destructive/10 px-4 py-2">
            <ThemedText className="text-sm text-destructive">
              error: {error}
            </ThemedText>
          </View>
        )}

        <View className="flex-row items-end gap-2 border-t border-border p-3">
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
