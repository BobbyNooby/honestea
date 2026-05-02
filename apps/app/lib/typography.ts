import type { TextStyle } from "react-native"

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
 * Display + heading styles use Georgia for the serif voice (the design
 * mockups all rendered in Georgia via `ui-serif` fallback). Body and
 * eyebrow text use the system sans, which on iOS/Android resolves to
 * SF Pro / Roboto — the closest free substitute for Geist Sans.
 */

const SERIF =
  // RN doesn't honor `ui-serif`, so name Georgia explicitly. Bundling
  // Geist as a custom font is a Stage 2 polish step.
  "Georgia"

const MONO =
  // Closest free pre-bundled mono on both platforms.
  "Menlo"

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
