import { useColorScheme } from "react-native"
import Svg, { Line, Path } from "react-native-svg"

interface Props {
  size?: number
}

/**
 * The HonesTea cup-and-leaf mark, inlined as react-native-svg primitives
 * (vs shipping the SVG asset and adding react-native-svg-transformer to
 * Metro). Identical viewBox + paths to assets/brand/logo-mark.svg.
 *
 * The leaf doubles as the steam rising from the cup — the visible
 * "honesty" you can see through. Light mode uses matcha-600 / oolong-400
 * tones; dark mode shifts to matcha-400 / oolong-300 for legibility on
 * dark surfaces, matching assets/brand/logo-mark-dark.svg.
 */
export function LogoMark({ size = 32 }: Props) {
  const dark = useColorScheme() === "dark"
  const stroke = dark ? "#8eb56b" : "#5b8a3a" // matcha-400 / matcha-600
  const teaFill = dark ? "#d9a26a" : "#c2884a" // oolong-300 / oolong-400
  const teaOpacity = dark ? 0.3 : 0.35
  const sheen = dark ? "#0f0e09" : "#fbf6e9" // chamomile-950 / chamomile-100

  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
      {/* cup body */}
      <Path
        d="M20 42 H72 L68 78 Q66 86 58 86 H34 Q26 86 24 78 Z"
        fill="none"
        stroke={stroke}
        strokeWidth={4}
        strokeLinejoin="round"
      />
      {/* tea fill */}
      <Path
        d="M24 50 H68 L65 76 Q63.5 81 58 81 H34 Q28.5 81 27 76 Z"
        fill={teaFill}
        fillOpacity={teaOpacity}
      />
      {/* tea surface line */}
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
      {/* leaf */}
      <Path
        d="M44 30 Q40 22 46 14 Q56 18 52 30 Z"
        fill={stroke}
      />
      {/* leaf vein (sheen color so it reads in both themes) */}
      <Path
        d="M48 30 L48 16"
        stroke={sheen}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      {/* steam wisp */}
      <Path
        d="M58 34 Q60 28 56 22"
        fill="none"
        stroke={stroke}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </Svg>
  )
}
