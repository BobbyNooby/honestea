import { useCallback, useRef, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { streamChat, type ChatMessage } from "@/lib/api"

const DEFAULT_MODEL = "anthropic/claude-haiku-4-5"

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
    ({ item }: { item: UiMessage }) => (
      <ThemedView
        style={[
          styles.bubble,
          item.role === "user" ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        <ThemedText style={styles.bubbleRole}>
          {item.role === "user" ? "you" : "assistant"}
        </ThemedText>
        <ThemedText>
          {item.content || (item.role === "assistant" && streaming ? "…" : "")}
        </ThemedText>
      </ThemedView>
    ),
    [streaming],
  )

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <ThemedText type="title">Honest AI</ThemedText>
          <ThemedText style={styles.dim}>{DEFAULT_MODEL}</ThemedText>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: true })
          }
          ListEmptyComponent={
            <ThemedView style={styles.empty}>
              <ThemedText style={styles.dim}>
                Start a conversation. Messages stream in real time from
                OpenRouter.
              </ThemedText>
            </ThemedView>
          }
        />

        {error && (
          <ThemedView style={styles.errorBar}>
            <ThemedText style={styles.errorText}>error: {error}</ThemedText>
          </ThemedView>
        )}

        <View style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Send a message…"
            placeholderTextColor="#888"
            style={styles.input}
            multiline
            editable={!streaming}
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <Pressable
            onPress={send}
            disabled={streaming || !input.trim()}
            style={({ pressed }) => [
              styles.sendBtn,
              (streaming || !input.trim()) && styles.sendBtnDisabled,
              pressed && styles.sendBtnPressed,
            ]}
          >
            {streaming ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.sendBtnText}>send</ThemedText>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 4,
  },
  dim: { opacity: 0.55, fontSize: 12 },
  list: { padding: 16, gap: 10, flexGrow: 1 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  bubble: {
    padding: 12,
    borderRadius: 12,
    gap: 4,
    maxWidth: "92%",
  },
  userBubble: { alignSelf: "flex-end", backgroundColor: "#3b82f6" },
  assistantBubble: { alignSelf: "flex-start" },
  bubbleRole: { fontSize: 11, opacity: 0.6, textTransform: "uppercase" },
  errorBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#fee2e2",
  },
  errorText: { color: "#991b1b", fontSize: 13 },
  inputRow: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    alignItems: "flex-end",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#444",
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#1e293b1a",
    color: "#fff",
    fontSize: 15,
  },
  sendBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 70,
    minHeight: 40,
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnPressed: { opacity: 0.7 },
  sendBtnText: { color: "#fff", fontWeight: "600" },
})
