import {
  IconClock,
  IconLink,
  IconWorld,
  type Icon,
} from "@tabler/icons-react-native"
import { Text, useColorScheme, View } from "react-native"

import type { ToolCallEvent } from "@/lib/api"

interface Props {
  /** Live tool calls for this turn, keyed by index. Caller maintains the
   *  state in the parent component as events stream in from the API. */
  calls: readonly ToolCallEvent[]
}

/**
 * Live status panel rendered above the assistant bubble while the model
 * is running server tools (web_search / web_fetch / datetime). One row
 * per active call, each with an icon + verb + truncated arg. Hides
 * itself when every call has phase="done" — the citations chip + the
 * answer content take over from there.
 */
export function ToolActivityPanel({ calls }: Props) {
  const visible = calls.filter((c) => c.phase !== "done")
  if (visible.length === 0) return null
  return (
    <View className="-ml-0.5 gap-1">
      {visible.map((c) => (
        <ToolRow key={c.index} call={c} />
      ))}
    </View>
  )
}

function ToolRow({ call }: { call: ToolCallEvent }) {
  const dark = useColorScheme() === "dark"
  const tone = dark ? "#a8c98a" : "#5b8a3a"
  const { Icon, label } = describeCall(call)
  return (
    <View className="flex-row items-center gap-2 self-start rounded-full bg-matcha-500/10 px-2.5 py-1 dark:bg-matcha-400/15">
      <Icon size={12} color={tone} strokeWidth={2} />
      <Text className="text-[11px] font-medium text-matcha-700 dark:text-matcha-300">
        {label}
        <Text className="opacity-70">…</Text>
      </Text>
    </View>
  )
}

/**
 * Map a tool call to an icon + label. We try to extract the relevant
 * arg (query / url / timezone) from the partial JSON args string —
 * during the streaming phase this may be malformed, so we fall back to
 * a generic verb when parsing fails.
 */
function describeCall(call: ToolCallEvent): { Icon: Icon; label: string } {
  const parsed = tryParseArgs(call.args)
  switch (call.name) {
    case "web_search": {
      const query =
        typeof parsed?.query === "string" ? parsed.query : null
      return {
        Icon: IconWorld,
        label: query ? `Searching: "${truncate(query, 36)}"` : "Searching the web",
      }
    }
    case "web_fetch": {
      const url = typeof parsed?.url === "string" ? parsed.url : null
      return {
        Icon: IconLink,
        label: url ? `Fetching ${hostname(url)}` : "Fetching a page",
      }
    }
    case "datetime":
      return { Icon: IconClock, label: "Checking the time" }
    default:
      return { Icon: IconWorld, label: `Running ${call.name}` }
  }
}

/**
 * Best-effort JSON parse of a (possibly partial) arguments string. The
 * model streams `{"query":"...` then completes the close-brace later;
 * during the streaming phase the parse will fail and we just show the
 * generic verb. After `finish_reason: "tool_calls"` fires the args
 * are complete and parsing succeeds.
 */
function tryParseArgs(s: string): Record<string, unknown> | null {
  if (!s) return null
  try {
    return JSON.parse(s) as Record<string, unknown>
  } catch {
    return null
  }
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}

function hostname(url: string): string {
  // Hand-roll instead of `new URL()` because RN's URL polyfill is
  // patchy on older Hermes builds. Strips scheme + path; keeps host.
  return url
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
}
