import { IconCheck } from "@tabler/icons-react-native"
import { Modal, Pressable, Text, useColorScheme, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { cn } from "@/lib/cn"
import { type ThemePreference } from "@/lib/theme"

interface Option {
  id: ThemePreference
  label: string
  description: string
}

const OPTIONS: readonly Option[] = [
  {
    id: "system",
    label: "System",
    description: "Follow the device color setting.",
  },
  { id: "light", label: "Light", description: "Always light theme." },
  { id: "dark", label: "Dark", description: "Always dark theme." },
]

/**
 * Bottom sheet picker for the color-mode setting. Matches the
 * "tap row → pick from list" pattern of the redesigned settings page.
 */
export function ColorModeSheet({
  open,
  current,
  onChange,
  onClose,
}: {
  open: boolean
  current: ThemePreference
  onChange: (next: ThemePreference) => void
  onClose: () => void
}) {
  const dark = useColorScheme() === "dark"
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
        {/* Inner Pressable swallows taps so they don't dismiss. */}
        <Pressable className="rounded-t-2xl bg-chamomile-50 dark:bg-zinc-950">
          <SafeAreaView edges={["bottom"]}>
            <View className="mx-auto mb-2 mt-2 h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            <Text className="px-5 pb-2 pt-1 text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Color mode
            </Text>
            {OPTIONS.map((opt) => (
              <Pressable
                key={opt.id}
                onPress={() => {
                  onChange(opt.id)
                  onClose()
                }}
                className={cn(
                  "flex-row items-center gap-3 px-5 py-3 active:bg-zinc-100 dark:active:bg-zinc-900",
                  current === opt.id && "bg-matcha-500/10 dark:bg-matcha-400/15",
                )}
              >
                <View className="flex-1 gap-0.5">
                  <Text className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                    {opt.label}
                  </Text>
                  <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                    {opt.description}
                  </Text>
                </View>
                {current === opt.id && (
                  <IconCheck
                    size={20}
                    color={dark ? "#a8c98a" : "#5b8a3a"}
                    strokeWidth={2.5}
                  />
                )}
              </Pressable>
            ))}
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
