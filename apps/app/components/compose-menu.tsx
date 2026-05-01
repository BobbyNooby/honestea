import {
  IconArrowLeft,
  IconCamera,
  IconCheck,
  IconPaperclip,
  IconPhoto,
  IconWorld,
  IconWriting,
  type Icon,
} from "@tabler/icons-react-native"
import { useState } from "react"
import { Modal, Pressable, Switch, Text, useColorScheme, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { cn } from "@/lib/cn"

export type ResponseStyle =
  | "normal"
  | "learning"
  | "concise"
  | "explanatory"
  | "formal"

interface Props {
  open: boolean
  onClose: () => void
  /** True when web search is active for the next send. */
  webSearch: boolean
  onToggleWebSearch: (next: boolean) => void
  /** Whether the active model supports OR's web_search server tool —
   *  i.e. whether its `supported_parameters` includes "tools". When false
   *  the toggle is disabled with a hint. */
  webSearchSupported: boolean
  /** Active response style. Picks are placeholder until the prompt-prefix
   *  layer is wired up. */
  style: ResponseStyle
  onChangeStyle: (next: ResponseStyle) => void
}

/**
 * Bottom sheet that opens from the composer's [+] button. Top-level rows
 * cover attachments + tool toggles; "Use style" pushes a second-level
 * screen inspired by Claude's response-style picker. Today most rows are
 * visual placeholders — only the web search toggle and style selection
 * are wired up to state.
 */
export function ComposeMenu({
  open,
  onClose,
  webSearch,
  onToggleWebSearch,
  webSearchSupported,
  style,
  onChangeStyle,
}: Props) {
  const [view, setView] = useState<"top" | "style">("top")
  const dark = useColorScheme() === "dark"
  const tint = dark ? "#e4e4e7" : "#3f3f46"

  // Reset to top-level when the sheet closes so reopening always starts here.
  const handleRequestClose = () => {
    setView("top")
    onClose()
  }

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={handleRequestClose}
    >
      <Pressable
        onPress={handleRequestClose}
        className="flex-1 justify-end bg-black/40"
      >
        {/* Inner Pressable swallows taps so they don't dismiss. */}
        <Pressable className="rounded-t-2xl bg-chamomile-50 dark:bg-zinc-950">
          <SafeAreaView edges={["bottom"]}>
            <View className="mx-auto mb-2 mt-2 h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" />

            {view === "top" ? (
              <>
                <SheetHeader title="Add to message" />
                <MenuRow
                  icon={IconPhoto}
                  iconColor={tint}
                  title="Add image"
                  description="Send a photo from your library."
                  onPress={() => {
                    /* placeholder — image picker lands later */
                  }}
                />
                <MenuRow
                  icon={IconCamera}
                  iconColor={tint}
                  title="Take photo"
                  description="Capture a new picture with the camera."
                  onPress={() => {
                    /* placeholder */
                  }}
                />
                <MenuRow
                  icon={IconPaperclip}
                  iconColor={tint}
                  title="Add file"
                  description="Attach a document or PDF for context."
                  onPress={() => {
                    /* placeholder */
                  }}
                />
                <View className="my-2 h-px bg-zinc-200 dark:bg-zinc-800" />
                <MenuRow
                  icon={IconWorld}
                  iconColor={tint}
                  title="Web search"
                  description={
                    !webSearchSupported
                      ? "This model doesn't support tool calling. Pick a different model to enable."
                      : webSearch
                        ? "Active — model can look things up online."
                        : "Let the model fetch fresh info from the web. ~$0.02/turn."
                  }
                  disabled={!webSearchSupported}
                  rightSlot={
                    <Switch
                      value={webSearch && webSearchSupported}
                      onValueChange={onToggleWebSearch}
                      disabled={!webSearchSupported}
                      thumbColor={
                        webSearch && webSearchSupported ? "#5b8a3a" : undefined
                      }
                      trackColor={{ true: "#a8c98a", false: "#d4d4d8" }}
                    />
                  }
                  onPress={() => {
                    if (!webSearchSupported) return
                    onToggleWebSearch(!webSearch)
                  }}
                />
                <MenuRow
                  icon={IconWriting}
                  iconColor={tint}
                  title="Use style"
                  description={describeStyle(style)}
                  rightSlot={<Chevron dark={dark} />}
                  onPress={() => setView("style")}
                />
              </>
            ) : (
              <>
                <SubSheetHeader
                  title="Use style"
                  onBack={() => setView("top")}
                />
                {STYLES.map((opt) => (
                  <StyleRow
                    key={opt.id}
                    label={opt.label}
                    description={opt.description}
                    selected={style === opt.id}
                    onPress={() => {
                      onChangeStyle(opt.id)
                      setView("top")
                    }}
                  />
                ))}
                <Text className="px-5 pb-3 pt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                  Style picks are saved but the prompt prefix that enforces
                  them is still in progress.
                </Text>
              </>
            )}
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function SheetHeader({ title }: { title: string }) {
  return (
    <Text className="px-5 pb-2 pt-1 text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
      {title}
    </Text>
  )
}

function SubSheetHeader({
  title,
  onBack,
}: {
  title: string
  onBack: () => void
}) {
  const dark = useColorScheme() === "dark"
  return (
    <View className="flex-row items-center px-2 pb-2 pt-1">
      <Pressable
        onPress={onBack}
        hitSlop={8}
        accessibilityLabel="Back"
        className="h-10 w-10 items-center justify-center rounded-full active:bg-zinc-100 dark:active:bg-zinc-900"
      >
        <IconArrowLeft
          size={20}
          color={dark ? "#e4e4e7" : "#3f3f46"}
          strokeWidth={1.75}
        />
      </Pressable>
      <View className="flex-1 items-center pr-10">
        <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          {title}
        </Text>
      </View>
    </View>
  )
}

interface MenuRowProps {
  icon: Icon
  iconColor: string
  title: string
  description: string
  rightSlot?: React.ReactNode
  onPress: () => void
  /** Greyed out, no press feedback. Used for the web search row when the
   *  active model doesn't support tool calling. */
  disabled?: boolean
}

function MenuRow({
  icon: IconCmp,
  iconColor,
  title,
  description,
  rightSlot,
  onPress,
  disabled,
}: MenuRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={cn(
        "flex-row items-center gap-4 px-5 py-3 active:bg-zinc-100 dark:active:bg-zinc-900",
        disabled && "opacity-50",
      )}
    >
      <IconCmp size={24} color={iconColor} strokeWidth={1.75} />
      <View className="flex-1 gap-0.5">
        <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          {title}
        </Text>
        <Text
          className="text-xs text-zinc-500 dark:text-zinc-400"
          numberOfLines={2}
        >
          {description}
        </Text>
      </View>
      {rightSlot}
    </Pressable>
  )
}

function StyleRow({
  label,
  description,
  selected,
  onPress,
}: {
  label: string
  description: string
  selected: boolean
  onPress: () => void
}) {
  const dark = useColorScheme() === "dark"
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "flex-row items-center gap-4 px-5 py-3 active:bg-zinc-100 dark:active:bg-zinc-900",
        selected && "bg-blue-500/5 dark:bg-blue-400/10",
      )}
    >
      <IconWriting
        size={26}
        color={dark ? "#e4e4e7" : "#3f3f46"}
        strokeWidth={1.5}
      />
      <View className="flex-1 gap-0.5">
        <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          {label}
        </Text>
        <Text
          className="text-xs text-zinc-500 dark:text-zinc-400"
          numberOfLines={2}
        >
          {description}
        </Text>
      </View>
      {selected && (
        <IconCheck
          size={18}
          color={dark ? "#60a5fa" : "#3b82f6"}
          strokeWidth={2.5}
        />
      )}
    </Pressable>
  )
}

function Chevron({ dark }: { dark: boolean }) {
  return (
    <Text className="text-2xl text-zinc-400 dark:text-zinc-600">
      {dark ? "›" : "›"}
    </Text>
  )
}

interface StyleOption {
  id: ResponseStyle
  label: string
  description: string
}

const STYLES: readonly StyleOption[] = [
  { id: "normal", label: "Normal", description: "Default responses." },
  {
    id: "learning",
    label: "Learning",
    description: "Patient, educational responses that build understanding.",
  },
  {
    id: "concise",
    label: "Concise",
    description: "Shorter responses, more messages.",
  },
  {
    id: "explanatory",
    label: "Explanatory",
    description: "Educational responses for learning.",
  },
  {
    id: "formal",
    label: "Formal",
    description: "Clear and well-structured responses.",
  },
]

function describeStyle(style: ResponseStyle): string {
  switch (style) {
    case "normal":
      return "Default responses."
    case "learning":
      return "Patient, educational, builds understanding."
    case "concise":
      return "Shorter responses, more messages."
    case "explanatory":
      return "Educational responses for learning."
    case "formal":
      return "Clear and well-structured responses."
  }
}
