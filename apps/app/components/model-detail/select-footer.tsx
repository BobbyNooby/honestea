import { Pressable, Text, useColorScheme, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { Button } from "@/components/ui/button"

/**
 * Sticky footer on the model detail screen. Either a disabled "Currently
 * selected" pill (when this model is already active) or a matcha "Use
 * this model" CTA that flips selection + dismissTo("/") back to chat.
 * Absolute-positioned so it floats over scrolling content; SafeAreaView
 * inside handles bottom inset on iOS.
 */
export function SelectFooter({
  isSelected,
  onSelect,
}: {
  isSelected: boolean
  onSelect: () => void
}) {
  const dark = useColorScheme() === "dark"
  return (
    <View
      className="absolute bottom-0 left-0 right-0 border-t border-zinc-200 bg-chamomile-50 px-5 pb-6 pt-3 dark:border-zinc-800 dark:bg-chamomile-900"
      style={{
        shadowColor: dark ? "#000" : "#999",
        shadowOpacity: 0.1,
        shadowRadius: 8,
      }}
    >
      <SafeAreaView edges={["bottom"]}>
        {isSelected ? (
          <Pressable
            disabled
            className="h-12 items-center justify-center rounded-full border border-matcha-500 bg-matcha-500/10"
          >
            <Text className="text-[15px] font-semibold text-matcha-700 dark:text-matcha-300">
              Currently selected
            </Text>
          </Pressable>
        ) : (
          <Button
            onPress={onSelect}
            className="h-12 rounded-full bg-matcha-600 dark:bg-matcha-400"
            textClassName="text-[15px]"
          >
            Use this model
          </Button>
        )}
      </SafeAreaView>
    </View>
  )
}
