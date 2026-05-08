import {
  IconArrowsMinimize,
  IconDotsVertical,
  IconMessagePlus,
  IconPencil,
  IconRefresh,
  IconStar,
  IconStarFilled,
  IconTrash,
} from "@tabler/icons-react-native"
import { useState } from "react"
import {
  Modal,
  Pressable,
  Text,
  useColorScheme,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import type { Conversation } from "@honestea/shared"

import { cn } from "@/lib/cn"

interface Props {
  conversation: Conversation | null
  onRename: () => void
  onRegenerateTitle: () => void
  onToggleStar: () => void
  onCompactNow: () => void
  /** When true, compaction is in progress — disable the compact menu item. */
  compacting?: boolean
  onDelete: () => void
  onNewChat: () => void
}

/**
 * Triple-dot popover anchored to the top-right of the chat header — same
 * shape as Claude's mobile menu. Title at the top, action rows below with
 * an icon on the right of each row, separator before "New chat".
 *
 * Uses a Modal instead of an inline View so the popover layers over the
 * chat content (Modal owns its own root).
 */
export function ChatActionsMenu({
  conversation,
  onRename,
  onRegenerateTitle,
  onToggleStar,
  onCompactNow,
  compacting = false,
  onDelete,
  onNewChat,
}: Props) {
  const [open, setOpen] = useState(false)
  const insets = useSafeAreaInsets()
  const dark = useColorScheme() === "dark"

  const triggerColor = dark ? "#f4f4f5" : "#18181b"

  const close = () => setOpen(false)

  const handle = (action: () => void) => () => {
    close()
    // Defer slightly so the modal has time to dismiss before whatever the
    // action triggers (e.g. another modal for rename) opens.
    setTimeout(action, 50)
  }

  const starred = conversation?.starred ?? false

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={8}
        accessibilityLabel="Chat actions"
        className="h-10 w-10 items-center justify-center rounded-md active:bg-zinc-100 dark:active:bg-zinc-800"
      >
        <IconDotsVertical size={22} color={triggerColor} strokeWidth={1.75} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <Pressable onPress={close} className="flex-1">
          <View
            // Anchor below the chat header. Header is ~52 px tall; add safe-
            // area top so we sit just under the triple-dot trigger.
            style={{ top: insets.top + 50 }}
            className="absolute right-3 w-72 overflow-hidden rounded-2xl bg-white shadow-lg dark:bg-zinc-900"
          >
            {conversation && (
              <View className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
                <Text
                  numberOfLines={2}
                  className="text-sm text-zinc-500 dark:text-zinc-400"
                >
                  {conversation.title ?? "New chat"}
                </Text>
              </View>
            )}

            <MenuRow
              label="Rename"
              icon={IconPencil}
              onPress={handle(onRename)}
              disabled={!conversation}
            />
            <MenuRow
              label="Regenerate title"
              icon={IconRefresh}
              onPress={handle(onRegenerateTitle)}
              disabled={!conversation}
            />
            <MenuRow
              label={starred ? "Unstar" : "Star"}
              icon={starred ? IconStarFilled : IconStar}
              onPress={handle(onToggleStar)}
              disabled={!conversation}
              iconColor={starred ? "#eab308" : undefined}
            />
            <MenuRow
              label="Compact now"
              icon={IconArrowsMinimize}
              onPress={handle(onCompactNow)}
              disabled={!conversation || compacting}
            />
            <MenuRow
              label="Delete"
              icon={IconTrash}
              destructive
              onPress={handle(onDelete)}
              disabled={!conversation}
            />

            <View className="my-1 h-px bg-zinc-100 dark:bg-zinc-800" />

            <MenuRow
              label="New chat"
              icon={IconMessagePlus}
              onPress={handle(onNewChat)}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  )
}

function MenuRow({
  label,
  icon: Icon,
  onPress,
  destructive = false,
  disabled = false,
  iconColor,
}: {
  label: string
  icon: typeof IconPencil
  onPress: () => void
  destructive?: boolean
  disabled?: boolean
  iconColor?: string
}) {
  const dark = useColorScheme() === "dark"
  const baseColor = dark ? "#f4f4f5" : "#18181b"
  const tint = destructive ? "#dc2626" : (iconColor ?? baseColor)

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={cn(
        "flex-row items-center justify-between px-4 py-3 active:bg-zinc-100 dark:active:bg-zinc-800",
        disabled && "opacity-40",
      )}
    >
      <Text
        className={cn(
          "text-base",
          destructive
            ? "text-red-600 dark:text-red-500"
            : "text-zinc-900 dark:text-zinc-100",
        )}
      >
        {label}
      </Text>
      <Icon size={20} color={tint} strokeWidth={1.75} />
    </Pressable>
  )
}
