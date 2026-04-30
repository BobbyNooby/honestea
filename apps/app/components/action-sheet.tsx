import type { Icon as TablerIcon } from "@tabler/icons-react-native"
import {
  Modal,
  Pressable,
  Text,
  useColorScheme,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { cn } from "@/lib/cn"

export interface ActionSheetItem {
  label: string
  icon: TablerIcon
  destructive?: boolean
  onPress: () => void
}

interface Props {
  open: boolean
  /** Optional caption shown above the actions — typically the target's name. */
  title?: string
  actions: readonly ActionSheetItem[]
  onClose: () => void
}

/**
 * Bottom sheet with rounded top corners that slides up over the screen.
 * Backdrop tap dismisses; pressing an action runs its handler then closes
 * the sheet. Replaces `Alert.alert([...buttons])` which renders as ugly
 * native dialogs on Android.
 *
 * The slight `setTimeout` between close + handler lets the close animation
 * start before the handler fires — otherwise opening a follow-up modal
 * (e.g. RenameDialog) competes with the action sheet's exit transition and
 * either flickers or eats taps.
 */
export function ActionSheet({ open, title, actions, onClose }: Props) {
  const dark = useColorScheme() === "dark"

  const handle = (action: () => void) => () => {
    onClose()
    setTimeout(action, 50)
  }

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        className="flex-1 justify-end bg-black/40"
      >
        <Pressable className="rounded-t-2xl bg-white dark:bg-zinc-950">
          <SafeAreaView edges={["bottom"]}>
            <View className="mx-auto mb-2 mt-2 h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            {title && (
              <Text
                numberOfLines={1}
                className="px-5 pb-2 pt-1 text-center text-xs text-zinc-500 dark:text-zinc-400"
              >
                {title}
              </Text>
            )}

            <View className="border-t border-zinc-100 dark:border-zinc-800">
              {actions.map((action, i) => {
                const Icon = action.icon
                const tint = action.destructive
                  ? "#dc2626"
                  : dark
                    ? "#f4f4f5"
                    : "#18181b"
                return (
                  <Pressable
                    key={`${action.label}-${i}`}
                    onPress={handle(action.onPress)}
                    className="flex-row items-center justify-between px-5 py-3.5 active:bg-zinc-100 dark:active:bg-zinc-900"
                  >
                    <Text
                      className={cn(
                        "text-base",
                        action.destructive
                          ? "text-red-600 dark:text-red-500"
                          : "text-zinc-900 dark:text-zinc-100",
                      )}
                    >
                      {action.label}
                    </Text>
                    <Icon size={20} color={tint} strokeWidth={1.75} />
                  </Pressable>
                )
              })}
            </View>

            <View className="px-3 pb-2 pt-3">
              <Pressable
                onPress={onClose}
                className="items-center rounded-xl bg-zinc-100 py-3.5 active:bg-zinc-200 dark:bg-zinc-900 dark:active:bg-zinc-800"
              >
                <Text className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                  Cancel
                </Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
