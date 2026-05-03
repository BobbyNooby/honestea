import { useMemo } from "react"
import { Linking, useColorScheme } from "react-native"
import Markdown from "react-native-markdown-display"

interface Props {
  children: string
}

/**
 * Themed wrapper around react-native-markdown-display tuned to look right
 * inside an assistant message bubble (zinc-100 / zinc-800 background).
 *
 * Only applied to assistant messages — user messages stay plain text since
 * users typically don't write markdown and we don't want their input to
 * accidentally render formatted.
 *
 * Links are scheme-allowlisted to https/http/mailto. The default
 * `react-native-markdown-display` behavior is `Linking.openURL(url)` with
 * no validation, which lets the model emit `[click](javascript:…)`,
 * `[x](file:///…)`, `[y](intent://…)` and tap-launch them. Since model
 * output (and web-search citations baked into it) is untrusted, we gate
 * the open-call.
 */
export function MarkdownText({ children }: Props) {
  const scheme = useColorScheme()
  const dark = scheme === "dark"

  const styles = useMemo(() => buildStyles(dark), [dark])

  return (
    <Markdown style={styles} onLinkPress={handleLinkPress}>
      {children}
    </Markdown>
  )
}

/**
 * Allow only http(s) and mailto links from rendered markdown. Returning
 * `false` cancels the library's default `Linking.openURL`; returning
 * `true` lets the default fire (we open it ourselves so the gate is
 * obvious in code).
 */
function handleLinkPress(url: string): boolean {
  if (/^https?:\/\//i.test(url) || /^mailto:/i.test(url)) {
    void Linking.openURL(url)
  }
  return false
}

function buildStyles(dark: boolean) {
  const text = dark ? "#f4f4f5" : "#18181b" // zinc-100 / zinc-900
  const muted = dark ? "#a1a1aa" : "#52525b" // zinc-400 / zinc-600
  const codeBg = dark ? "#0a0a0a" : "#fafafa" // zinc-950 / zinc-50
  const codeBorder = dark ? "#27272a" : "#e4e4e7" // zinc-800 / zinc-200
  const link = dark ? "#60a5fa" : "#2563eb" // blue-400 / blue-600

  return {
    body: { color: text, fontSize: 16, lineHeight: 22 },
    paragraph: {
      color: text,
      marginTop: 0,
      marginBottom: 8,
      lineHeight: 22,
    },
    heading1: { color: text, fontWeight: "700" as const, fontSize: 22, marginTop: 8, marginBottom: 6 },
    heading2: { color: text, fontWeight: "700" as const, fontSize: 19, marginTop: 8, marginBottom: 6 },
    heading3: { color: text, fontWeight: "600" as const, fontSize: 17, marginTop: 6, marginBottom: 4 },
    strong: { color: text, fontWeight: "700" as const },
    em: { color: text, fontStyle: "italic" as const },
    bullet_list: { marginBottom: 8 },
    ordered_list: { marginBottom: 8 },
    list_item: { color: text, marginBottom: 2 },
    code_inline: {
      color: text,
      backgroundColor: codeBg,
      borderColor: codeBorder,
      borderWidth: 1,
      borderRadius: 4,
      paddingHorizontal: 4,
      paddingVertical: 1,
      fontFamily: "Courier",
      fontSize: 14,
    },
    code_block: {
      color: text,
      backgroundColor: codeBg,
      borderColor: codeBorder,
      borderWidth: 1,
      borderRadius: 6,
      padding: 10,
      fontFamily: "Courier",
      fontSize: 14,
      marginBottom: 8,
    },
    fence: {
      color: text,
      backgroundColor: codeBg,
      borderColor: codeBorder,
      borderWidth: 1,
      borderRadius: 6,
      padding: 10,
      fontFamily: "Courier",
      fontSize: 14,
      marginBottom: 8,
    },
    blockquote: {
      color: muted,
      backgroundColor: codeBg,
      borderLeftColor: codeBorder,
      borderLeftWidth: 3,
      paddingLeft: 10,
      paddingVertical: 4,
      marginBottom: 8,
    },
    link: { color: link, textDecorationLine: "underline" as const },
    hr: { backgroundColor: codeBorder, height: 1, marginVertical: 8 },
  }
}
