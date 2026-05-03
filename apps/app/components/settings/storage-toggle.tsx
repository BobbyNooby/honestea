import {
  IconCloud,
  IconDeviceMobile,
} from "@tabler/icons-react-native"
import { useState } from "react"
import { Pressable, useColorScheme } from "react-native"

/**
 * Local/cloud storage indicator in the chat header. Visual-only for now —
 * taps toggle between the device-mobile and cloud icons. Wires to the
 * conversation's `userId` field once cloud sync ships.
 */
export function StorageToggle() {
  const [isCloud, setIsCloud] = useState(false)
  const dark = useColorScheme() === "dark"
  const Icon = isCloud ? IconCloud : IconDeviceMobile
  const tint = dark ? "#f4f4f5" : "#18181b"
  return (
    <Pressable
      onPress={() => setIsCloud((v) => !v)}
      hitSlop={8}
      accessibilityLabel={isCloud ? "Cloud storage" : "Local storage"}
      className="h-10 w-10 items-center justify-center rounded-md active:bg-zinc-100 dark:active:bg-zinc-800"
    >
      <Icon size={22} color={tint} strokeWidth={1.75} />
    </Pressable>
  )
}
