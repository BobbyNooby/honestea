import { IconCheck, IconX } from "@tabler/icons-react-native"
import { useEffect, useState } from "react"
import { Pressable, Text, View } from "react-native"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated"

interface Props {
  /** Cancel — discards the partial transcript and exits recording. */
  onCancel: () => void
  /** Confirm — commits the final transcript and exits recording. */
  onConfirm: () => void
}

const BAR_COUNT = 16
const BAR_WIDTH = 4
const BAR_GAP = 4
const BAR_MIN_H = 4
const BAR_MAX_H = 22

/**
 * Replaces the composer pill while voice input is active. Mirrors the
 * Claude / iMessage recording UI: terracotta-style matcha pill with a
 * cancel (X) on the left, an animated waveform + elapsed timer in the
 * middle, and a confirm (✓) on the right.
 *
 * The waveform is decorative — `@jamsch/expo-speech-recognition` doesn't
 * surface real audio amplitude, so each bar runs its own staggered
 * pulse via Reanimated. Looks "live" without lying about responsiveness.
 */
export function RecordingPill({ onCancel, onConfirm }: Props) {
  const elapsed = useElapsedSeconds()
  return (
    <View className="flex-row items-center gap-3 rounded-[28px] bg-matcha-600 px-2 py-2 dark:bg-matcha-500">
      <Pressable
        onPress={onCancel}
        accessibilityLabel="Cancel voice input"
        className="h-11 w-11 items-center justify-center rounded-full bg-matcha-700/40 active:opacity-70"
      >
        <IconX size={20} color="#ffffff" strokeWidth={2.5} />
      </Pressable>

      <View className="flex-1 flex-row items-center justify-center gap-2">
        <Waveform />
        <Text className="text-[15px] font-semibold tabular-nums text-white">
          {formatElapsed(elapsed)}
        </Text>
      </View>

      <Pressable
        onPress={onConfirm}
        accessibilityLabel="Stop and use transcript"
        className="h-11 w-11 items-center justify-center rounded-full bg-white active:opacity-80"
      >
        <IconCheck size={22} color="#5b8a3a" strokeWidth={3} />
      </Pressable>
    </View>
  )
}

function Waveform() {
  return (
    <View
      className="flex-row items-center"
      style={{ height: BAR_MAX_H, gap: BAR_GAP }}
    >
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <WaveformBar key={i} index={i} />
      ))}
    </View>
  )
}

function WaveformBar({ index }: { index: number }) {
  const height = useSharedValue(BAR_MIN_H)
  useEffect(() => {
    // Stagger each bar's animation start so the wave reads as a moving
    // amplitude rather than a synchronized blink.
    const peakDuration = 380 + ((index * 47) % 220)
    const delay = (index * 60) % 480
    const handle = setTimeout(() => {
      height.value = withRepeat(
        withSequence(
          withTiming(BAR_MAX_H, { duration: peakDuration }),
          withTiming(BAR_MIN_H + ((index * 3) % 6), {
            duration: peakDuration,
          }),
        ),
        -1,
        true,
      )
    }, delay)
    return () => clearTimeout(handle)
  }, [index, height])

  const animatedStyle = useAnimatedStyle(() => ({ height: height.value }))

  return (
    <Animated.View
      style={[
        {
          width: BAR_WIDTH,
          backgroundColor: "#ffffff",
          borderRadius: BAR_WIDTH / 2,
        },
        animatedStyle,
      ]}
    />
  )
}

function useElapsedSeconds(): number {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const start = Date.now()
    const id = setInterval(() => {
      setSeconds(Math.floor((Date.now() - start) / 1000))
    }, 250)
    return () => clearInterval(id)
  }, [])
  return seconds
}

function formatElapsed(s: number): string {
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`
}
