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
 * streaming-state placeholder in place of the bare "…". Mirrors the
 * `LogoBrewing` component from the design kit (animated-logos.jsx):
 *
 *  - Tea fill rises from empty → full over ~2.4s, holds, repeats.
 *  - A steam wisp rises through the lifecycle, fading in and out.
 *
 * Reanimated worklets drive the SVG transforms; same theme color rules
 * as the static LogoMark.
 */
export function BrewingMark({ size = 96 }: Props) {
  const dark = useColorScheme() === "dark"
  const stroke = dark ? "#8eb56b" : "#5b8a3a" // matcha-400 / matcha-600
  const teaFill = dark ? "#d9a26a" : "#c2884a" // oolong-300 / oolong-400

  const fillY = useSharedValue(28)
  const steamY = useSharedValue(6)
  const steamOpacity = useSharedValue(0)

  useEffect(() => {
    // Tea fill cycle: rise from y=28 (below the visible cup) to y=0 (full
    // cup) over 1.32s, hold for 1.08s, then snap back. cubic-bezier
    // matches the standard easing token from colors_and_type.css.
    const fillEasing = Easing.bezier(0.4, 0, 0.2, 1)
    fillY.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1320, easing: fillEasing }),
        withTiming(0, { duration: 1080 }),
        withTiming(28, { duration: 0 }),
      ),
      -1,
      false,
    )

    // Steam wisp: rise + fade in + fade out over 2.6s, infinite.
    steamY.value = withRepeat(
      withSequence(
        withTiming(6, { duration: 0 }),
        withTiming(-16, { duration: 2600, easing: Easing.out(Easing.quad) }),
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
  }, [fillY, steamY, steamOpacity])

  const fillProps = useAnimatedProps(() => ({
    transform: `translate(0 ${fillY.value})`,
  }))
  const steamProps = useAnimatedProps(() => ({
    transform: `translate(0 ${steamY.value})`,
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

      {/* animated tea fill — clipped to cup interior */}
      <G clipPath="url(#brewing-cup-clip)">
        <AnimatedRect
          animatedProps={fillProps}
          x={20}
          y={50}
          width={56}
          height={36}
          fill={teaFill}
          fillOpacity={0.7}
        />
      </G>

      {/* rim line */}
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

      {/* animated steam wisp */}
      <AnimatedG animatedProps={steamProps}>
        <Path
          d="M44 30 Q40 22 46 14 Q56 18 52 30 Z"
          fill={stroke}
          fillOpacity={0.85}
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
