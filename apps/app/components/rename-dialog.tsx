import { useEffect, useState } from "react"
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native"

import { Button } from "@/components/ui/button"

interface Props {
  /** When non-null, the dialog is open and seeded with this title. Null = closed. */
  initial: { id: string; title: string | null } | null
  onCancel: () => void
  onSubmit: (id: string, next: string) => void
}

/**
 * Cross-platform rename dialog. `Alert.prompt` is iOS-only, so we render
 * a lightweight modal with a TextInput and matching Save/Cancel buttons.
 * Used by both the sidebar long-press menu and the chat header triple-dot
 * menu.
 */
export function RenameDialog({ initial, onCancel, onSubmit }: Props) {
  const [text, setText] = useState("")

  useEffect(() => {
    setText(initial?.title ?? "")
  }, [initial])

  const visible = initial !== null

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <Pressable
          onPress={onCancel}
          className="flex-1 items-center justify-center bg-black/40 px-8"
        >
          <Pressable className="w-full max-w-sm gap-3 rounded-2xl bg-white p-5 dark:bg-zinc-900">
            <Text className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Rename chat
            </Text>
            <TextInput
              value={text}
              onChangeText={setText}
              autoFocus
              placeholder="Chat title"
              placeholderTextColor="#71717a"
              selectTextOnFocus
              className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-base text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <View className="mt-1 flex-row justify-end gap-2">
              <Button variant="outline" size="sm" onPress={onCancel}>
                Cancel
              </Button>
              <Button
                size="sm"
                onPress={() => {
                  if (initial) onSubmit(initial.id, text)
                }}
              >
                Save
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  )
}
