import {
  IconChevronRight,
  IconCloud,
  IconDeviceMobile,
  IconStarFilled,
} from "@tabler/icons-react-native"
import { router, useFocusEffect } from "expo-router"
import { useCallback, useState } from "react"
import {
  Alert,
  FlatList,
  Pressable,
  Text,
  useColorScheme,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { toast } from "sonner-native"

import type { Conversation } from "@honestea/shared"

import { RenameDialog } from "@/components/rename-dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/cn"
import { useConversations } from "@/lib/conversations-context"
import { listMessages, renameConversation } from "@/lib/db/repository"
import { useSelectedModel } from "@/lib/selected-model"
import { generateTitle } from "@/lib/title-gen"

export interface SidebarProps {
  onClose: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  const { conversations, currentId, refresh, startNew, select, remove } =
    useConversations()
  const { modelId } = useSelectedModel()
  const [renameTarget, setRenameTarget] = useState<Conversation | null>(null)

  // Refresh the list every time the drawer regains focus, so newly created
  // conversations and titles updated by the title generator show up promptly.
  useFocusEffect(
    useCallback(() => {
      refresh()
    }, [refresh]),
  )

  const goToSettings = () => {
    onClose()
    router.push("/settings")
  }

  const handleNewChat = async () => {
    await startNew(modelId)
    onClose()
  }

  const handleSelect = (id: string) => {
    select(id)
    onClose()
  }

  const confirmDelete = (convo: Conversation) => {
    Alert.alert(
      "Delete chat?",
      convo.title ?? "New chat",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void remove(convo.id)
          },
        },
      ],
      { cancelable: true },
    )
  }

  const regenerateTitle = async (convo: Conversation) => {
    const msgs = await listMessages(convo.id)
    const firstUser = msgs.find((m) => m.role === "user")
    const firstAssistant = msgs.find(
      (m) => m.role === "assistant" && m.status === "complete",
    )
    if (!firstUser || !firstAssistant) {
      toast.error("Send a message first")
      return
    }
    const title = await generateTitle({
      userMessage: firstUser.content,
      assistantResponse: firstAssistant.content,
    })
    if (!title) {
      toast.error("Title generation failed")
      return
    }
    await renameConversation(convo.id, title)
    await refresh()
    toast.success("Title regenerated")
  }

  const showActions = (convo: Conversation) => {
    Alert.alert(convo.title ?? "New chat", undefined, [
      { text: "Rename", onPress: () => setRenameTarget(convo) },
      {
        text: "Regenerate title",
        onPress: () => {
          void regenerateTitle(convo)
        },
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => confirmDelete(convo),
      },
      { text: "Cancel", style: "cancel" },
    ])
  }

  const submitRename = async (id: string, next: string) => {
    setRenameTarget(null)
    const trimmed = next.trim()
    if (!trimmed) return
    await renameConversation(id, trimmed)
    await refresh()
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-zinc-950" edges={["top", "bottom"]}>
      <View className="flex-1 px-4 py-3">
        <View className="mb-6 flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Honest AI
          </Text>
        </View>

        <Button onPress={handleNewChat} variant="outline" className="mb-6">
          + New chat
        </Button>

        <Text className="mb-2 px-1 text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Recent
        </Text>

        {conversations.length === 0 ? (
          <View className="flex-1 items-center justify-center px-2">
            <Text className="text-center text-sm text-zinc-500 dark:text-zinc-400">
              No conversations yet. Tap + New chat to start one.
            </Text>
          </View>
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => (
              <ConversationRow
                convo={item}
                active={item.id === currentId}
                onPress={() => handleSelect(item.id)}
                onLongPress={() => showActions(item)}
              />
            )}
            contentContainerClassName="gap-1 pb-4"
          />
        )}

        <View className="border-t border-zinc-200 pt-3 dark:border-zinc-800">
          <Pressable
            onPress={goToSettings}
            className="flex-row items-center justify-between rounded-md px-2 py-3 active:bg-zinc-100 dark:active:bg-zinc-900"
          >
            <Text className="text-base text-zinc-900 dark:text-zinc-100">
              Settings
            </Text>
            <SettingsChevron />
          </Pressable>
          <Text className="mt-1 px-2 text-xs text-zinc-400 dark:text-zinc-500">
            v0.0.0
          </Text>
        </View>
      </View>

      <RenameDialog
        initial={
          renameTarget
            ? { id: renameTarget.id, title: renameTarget.title }
            : null
        }
        onCancel={() => setRenameTarget(null)}
        onSubmit={submitRename}
      />
    </SafeAreaView>
  )
}

function ConversationRow({
  convo,
  active,
  onPress,
  onLongPress,
}: {
  convo: Conversation
  active: boolean
  onPress: () => void
  onLongPress: () => void
}) {
  const dark = useColorScheme() === "dark"
  // Phase 1: every chat is local. Stays accurate when sync ships and rows
  // start having a non-null userId.
  const isCloud = convo.userId !== null
  const Icon = isCloud ? IconCloud : IconDeviceMobile
  const tint = dark ? "#71717a" : "#a1a1aa" // zinc-500 / zinc-400 to match prior text tone
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      className={cn(
        "flex-row items-center gap-2 rounded-md px-2 py-2.5 active:bg-zinc-100 dark:active:bg-zinc-900",
        active && "bg-zinc-100 dark:bg-zinc-900",
      )}
    >
      <Icon size={16} color={tint} strokeWidth={1.75} />
      <Text
        numberOfLines={1}
        className="flex-1 text-sm text-zinc-900 dark:text-zinc-100"
      >
        {convo.title ?? "New chat"}
      </Text>
      {convo.starred && (
        <IconStarFilled size={13} color="#eab308" />
      )}
    </Pressable>
  )
}

function SettingsChevron() {
  const dark = useColorScheme() === "dark"
  return (
    <IconChevronRight
      size={18}
      color={dark ? "#71717a" : "#a1a1aa"}
      strokeWidth={1.75}
    />
  )
}

