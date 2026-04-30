import { useEffect } from "react"
import { useColorScheme } from "react-native"
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated"
import Svg, {
  ClipPath,
  Defs,
  G,
  Line,
  Path,
  Rect,
} from "react-native-svg"

const AnimatedRect = Animated.createAnimatedComponent(Rect)
const AnimatedG = Animated.createAnimatedComponent(G)

interface Props {
  size?: number
}

/**
 * Animated brewing variant of the cup-and-leaf mark — used as the
 * streaming-state placeholder in the assistant bubble. Mirrors the
 * `LogoBrewing` variant from the design kit (animated-logos.jsx):
 *
 *  - Tea fill rises from empty → full over ~1.32s, holds ~1.08s, repeats.
 *    Bottom-anchored: `y` and `height` are animated together so the rect
 *    grows upward from the bottom of the cup interior.
 *  - Steam wisp fades in/out on a 2.6s loop (opacity-only — animating SVG
 *    `transform` via Reanimated 4 worklets isn't reliable enough yet).
 *  - Theme-aware: matcha-600 / oolong-400 in light, matcha-400 /
 *    oolong-300 in dark.
 */
export function BrewingMark({ size = 96 }: Props) {
  const dark = useColorScheme() === "dark"
  const stroke = dark ? "#8eb56b" : "#5b8a3a"
  const teaFill = dark ? "#d9a26a" : "#c2884a"

  const teaLevel = useSharedValue(0) // 0 = empty, 1 = full
  const steamOpacity = useSharedValue(0)

  useEffect(() => {
    const fillEasing = Easing.bezier(0.4, 0, 0.2, 1)
    teaLevel.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1320, easing: fillEasing }),
        withTiming(1, { duration: 1080 }),
        withTiming(0, { duration: 0 }),
      ),
      -1,
      false,
    )

    steamOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(0.85, { duration: 520 }),
        withTiming(0.5, { duration: 1300 }),
        withTiming(0, { duration: 780 }),
      ),
      -1,
      false,
    )
  }, [teaLevel, steamOpacity])

  // Cup interior: top y=50, bottom y=86, height 36. Anchor the rect at the
  // bottom and grow the height to fill upward — animating y and height
  // together is far more reliable than animating a transform string.
  const fillProps = useAnimatedProps(() => {
    const h = 36 * teaLevel.value
    return {
      y: 86 - h,
      height: h,
    }
  })

  const steamProps = useAnimatedProps(() => ({
    opacity: steamOpacity.value,
  }))

  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
      <Defs>
        <ClipPath id="brewing-cup-clip">
          <Path d="M24 50 H68 L65 76 Q63.5 81 58 81 H34 Q28.5 81 27 76 Z" />
        </ClipPath>
      </Defs>

      {/* cup outline */}
      <Path
        d="M20 42 H72 L68 78 Q66 86 58 86 H34 Q26 86 24 78 Z"
        fill="none"
        stroke={stroke}
        strokeWidth={4}
        strokeLinejoin="round"
      />

      {/* animated tea fill, clipped to cup interior */}
      <G clipPath="url(#brewing-cup-clip)">
        <AnimatedRect
          animatedProps={fillProps}
          x={20}
          width={56}
          fill={teaFill}
          fillOpacity={0.7}
        />
      </G>

      {/* rim */}
      <Line
        x1={24}
        y1={50}
        x2={68}
        y2={50}
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
      />

      {/* handle */}
      <Path
        d="M72 50 Q84 52 84 60 Q84 68 72 70"
        fill="none"
        stroke={stroke}
        strokeWidth={4}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* steam wisp — opacity-only animation */}
      <AnimatedG animatedProps={steamProps}>
        <Path
          d="M44 30 Q40 22 46 14 Q56 18 52 30 Z"
          fill={stroke}
          fillOpacity={0.9}
        />
        <Path
          d="M58 34 Q60 28 56 22"
          fill="none"
          stroke={stroke}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      </AnimatedG>
    </Svg>
  )
}
