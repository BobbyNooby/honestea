import { IconChevronDown } from "@tabler/icons-react-native"
import { Pressable, Text, useColorScheme } from "react-native"
import Animated, { FadeIn, FadeOut } from "react-native-reanimated"

interface Props {
  visible: boolean
  onPress: () => void
}

export function ScrollToBottom({ visible, onPress }: Props) {
  if (!visible) return null

  return (
    <Animated.View
      entering={FadeIn.springify().damping(14).stiffness(200)}
      exiting={FadeOut.duration(150)}
      className="absolute bottom-2 left-0 right-0 z-10 items-center"
    >
      <InnerButton onPress={onPress} />
    </Animated.View>
  )
}

function InnerButton({ onPress }: { onPress: () => void }) {
  const dark = useColorScheme() === "dark"

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-1 rounded-full border bg-white/90 px-3.5 py-1.5 shadow-md dark:bg-zinc-800/90 dark:border-zinc-700"
    >
      <IconChevronDown
        size={14}
        color={dark ? "#e4e4e7" : "#3f3f46"}
        strokeWidth={2.5}
      />
      <Text className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
        Latest
      </Text>
    </Pressable>
  )
}