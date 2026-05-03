import { Platform, type TextStyle } from "react-native"

/**
 * HonesTea typography tokens — mirrored from
 * `colors_and_type.css` in the design bundle so the app uses the same
 * scale the design system was built against.
 *
 * Use these tokens for inline `style={...}` instead of redeclaring
 * font sizes / weights at every call site. Color is applied separately
 * (NativeWind classes for dark-mode swap), so these tokens deliberately
 * omit `color`.
 *
 * Platform notes:
 *  - iOS / macOS ship Georgia as a system font; we name it directly.
 *  - Android does NOT have Georgia. Without `Platform.select` the name
 *    silently falls back to Roboto sans-serif — which means every
 *    "serif headline" rendered as sans on Android until this fix. The
 *    `"serif"` keyword resolves to Noto Serif on Android, the system
 *    serif. Visual ≠ identical to iOS Georgia but both are real serifs.
 *  - Mono follows the same pattern: Menlo on iOS, `monospace` keyword
 *    on Android (resolves to Droid Sans Mono / Roboto Mono).
 *
 * TODO (Stage 2 polish): bundle a single serif via expo-font so iOS
 * and Android render identically. Lora (`@expo-google-fonts/lora`) is
 * the closest OFL-licensed substitute for Georgia.
 */

const SERIF = Platform.select({
  ios: "Georgia",
  android: "serif",
  default: "Georgia",
})

const MONO = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: "Menlo",
})

/** Hero — onboarding tagline, pricing/landing splash. */
export const TYPE_DISPLAY: TextStyle = {
  fontFamily: SERIF,
  fontSize: 32,
  fontWeight: "700",
  lineHeight: 35,
  letterSpacing: -0.7,
}

/** Major page heading — settings title, pricing "Hosted plans". */
export const TYPE_H1: TextStyle = {
  fontFamily: SERIF,
  fontSize: 28,
  fontWeight: "600",
  lineHeight: 32,
  letterSpacing: -0.6,
}

/** Card / section title — plan name, modal heading. */
export const TYPE_H2: TextStyle = {
  fontFamily: SERIF,
  fontSize: 22,
  fontWeight: "600",
  lineHeight: 26,
  letterSpacing: -0.4,
}

/** Sub-card / row title. */
export const TYPE_H3: TextStyle = {
  fontFamily: SERIF,
  fontSize: 18,
  fontWeight: "600",
  lineHeight: 22,
  letterSpacing: -0.3,
}

/** Body copy — paragraphs, descriptions. */
export const TYPE_BODY: TextStyle = {
  fontSize: 16,
  fontWeight: "400",
  lineHeight: 24,
}

/** Smaller body — bullets, taglines. */
export const TYPE_BODY_SM: TextStyle = {
  fontSize: 14,
  fontWeight: "400",
  lineHeight: 20,
}

/** Caption — meta text under a row, hints. */
export const TYPE_CAPTION: TextStyle = {
  fontSize: 12,
  fontWeight: "400",
  lineHeight: 16,
}

/** Eyebrow — uppercase mono section labels above cards. */
export const TYPE_EYEBROW: TextStyle = {
  fontFamily: MONO,
  fontSize: 10,
  fontWeight: "700",
  lineHeight: 14,
  letterSpacing: 0.8,
  textTransform: "uppercase",
}

/** Smallest readable text — disclaimer, footnote. */
export const TYPE_MICRO: TextStyle = {
  fontSize: 11,
  fontWeight: "400",
  lineHeight: 14,
}
