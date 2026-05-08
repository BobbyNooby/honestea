import {
  IconCloud,
  IconDeviceMobile,
} from "@tabler/icons-react-native"
import { Pressable, useColorScheme } from "react-native"
import Toast from "react-native-toast-message"

/**
 * Local/cloud storage indicator in the chat header. Visual-only for now —
 * always reads as local (Phase 1 has no cloud sync). Tapping shows a toast
 * explaining the current state.
 */
export function StorageToggle() {
  const dark = useColorScheme() === "dark"
  const tint = dark ? "#f4f4f5" : "#18181b"
  return (
    <Pressable
      onPress={() => {
        Toast.show({
          type: "info",
          text1: "Local only",
          text2: "Cloud sync coming in Phase 2.",
        })
      }}
      hitSlop={8}
      accessibilityLabel="Local storage"
      className="h-10 w-10 items-center justify-center rounded-md active:bg-zinc-100 dark:active:bg-zinc-800"
    >
      <IconDeviceMobile size={22} color={tint} strokeWidth={1.75} />
    </Pressable>
  )
}