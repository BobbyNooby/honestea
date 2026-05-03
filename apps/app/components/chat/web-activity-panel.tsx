import {
  IconChevronDown,
  IconChevronRight,
  IconClock,
  IconExternalLink,
  IconLink,
  IconWorld,
  type Icon,
} from "@tabler/icons-react-native"
import { useState } from "react"
import { Linking, Pressable, Text, useColorScheme, View } from "react-native"

import type { Citation, PersistedToolCall } from "@honestea/shared"

interface Props {
  /** Server tools the assistant invoked this turn. May be empty. */
  toolCalls: readonly PersistedToolCall[]
  /** Web-search sources the model cited. May be empty. */
  citations: readonly Citation[]
}

/**
 * Claude-style collapsible "Searched the web" panel rendered above a
 * completed assistant turn. Collapsed: a single muted "Searched the web ›"
 * row. Expanded: per-call header (icon + parsed query/url + result count)
 * with the citation list nested beneath the search call.
 *
 * Hides itself when there's nothing to show — no tool calls AND no
 * citations means the model didn't use any server tools this turn.
 */
export function WebActivityPanel({ toolCalls, citations }: Props) {
  const [open, setOpen] = useState(false)
  const dark = useColorScheme() === "dark"
  const tint = dark ? "#a8c98a" : "#5b8a3a"
  const muted = dark ? "#a1a1aa" : "#71717a"

  if (toolCalls.length === 0 && citations.length === 0) return null

  // Pre-completion fallback: legacy turns wrote citations but no tool
  // calls. Synthesize a single web_search entry so the panel still has
  // something to render as the parent call.
  const calls: readonly PersistedToolCall[] =
    toolCalls.length > 0
      ? toolCalls
      : [{ name: "web_search", args: "" }]

  const { label: headerLabel, Icon: HeaderIcon } = pickHeader(calls)

  return (
    <View className="-ml-0.5 self-stretch">
      <Pressable
        onPress={() => setOpen((o) => !o)}
        hitSlop={4}
        className="flex-row items-center gap-1.5 self-start rounded-full px-1.5 py-1 active:opacity-70"
      >
        <HeaderIcon size={12} color={tint} strokeWidth={2} />
        <Text className="text-[12px] text-zinc-500 dark:text-zinc-400">
          {headerLabel}
        </Text>
        {open ? (
          <IconChevronDown size={12} color={muted} strokeWidth={2} />
        ) : (
          <IconChevronRight size={12} color={muted} strokeWidth={2} />
        )}
      </Pressable>

      {open && (
        <View className="mt-1.5 gap-2 rounded-2xl border border-zinc-200 bg-zinc-50/60 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/40">
          {calls.map((call, i) => (
            <CallBlock
              key={`${call.name}-${i}`}
              call={call}
              citations={call.name === "web_search" ? citations : []}
              tint={tint}
              muted={muted}
            />
          ))}
        </View>
      )}
    </View>
  )
}

function CallBlock({
  call,
  citations,
  tint,
  muted,
}: {
  call: PersistedToolCall
  citations: readonly Citation[]
  tint: string
  muted: string
}) {
  const { Icon, label } = describeCall(call)
  return (
    <View className="gap-1.5">
      <View className="flex-row items-center gap-2">
        <Icon size={13} color={tint} strokeWidth={2} />
        <Text
          className="flex-1 text-[12px] font-medium text-zinc-800 dark:text-zinc-200"
          numberOfLines={2}
        >
          {label}
        </Text>
        {citations.length > 0 && (
          <Text className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {citations.length}{" "}
            {citations.length === 1 ? "result" : "results"}
          </Text>
        )}
      </View>
      {citations.length > 0 && (
        <View className="ml-1 gap-0.5 rounded-xl bg-white/70 px-2 py-1.5 dark:bg-zinc-950/40">
          {citations.map((c, i) => (
            <CitationRow
              key={`${c.url}-${i}`}
              citation={c}
              muted={muted}
            />
          ))}
        </View>
      )}
    </View>
  )
}

function CitationRow({
  citation,
  muted,
}: {
  citation: Citation
  muted: string
}) {
  return (
    <Pressable
      onPress={() => openSafeUrl(citation.url)}
      hitSlop={2}
      className="flex-row items-center gap-2 rounded-md px-1.5 py-1 active:bg-zinc-100 dark:active:bg-zinc-900"
    >
      <Text
        className="flex-1 text-[12px] text-zinc-700 dark:text-zinc-300"
        numberOfLines={1}
      >
        {citation.title ?? hostname(citation.url)}
      </Text>
      <Text className="text-[11px] text-zinc-500 dark:text-zinc-400">
        {hostname(citation.url)}
      </Text>
      <IconExternalLink size={11} color={muted} strokeWidth={2} />
    </Pressable>
  )
}

/**
 * Pick the collapsed-state header (label + leading icon). "Searched the
 * web" is the most meaningful default; if every call was a non-search
 * tool we still want a sensible header rather than the literal tool name.
 */
function pickHeader(calls: readonly PersistedToolCall[]): {
  label: string
  Icon: Icon
} {
  if (calls.some((c) => c.name === "web_search")) {
    return { label: "Searched the web", Icon: IconWorld }
  }
  if (calls.some((c) => c.name === "web_fetch")) {
    return { label: "Fetched a page", Icon: IconLink }
  }
  if (calls.some((c) => c.name === "datetime")) {
    return { label: "Checked the time", Icon: IconClock }
  }
  return { label: "Used tools", Icon: IconWorld }
}

function describeCall(call: PersistedToolCall): {
  Icon: Icon
  label: string
} {
  const parsed = tryParseArgs(call.args)
  switch (call.name) {
    case "web_search": {
      const query =
        typeof parsed?.query === "string" ? parsed.query : null
      return {
        Icon: IconWorld,
        label: query ?? "Web search",
      }
    }
    case "web_fetch": {
      const url = typeof parsed?.url === "string" ? parsed.url : null
      return {
        Icon: IconLink,
        label: url ? `Fetched ${hostname(url)}` : "Fetched a page",
      }
    }
    case "datetime":
      return { Icon: IconClock, label: "Checked the current time" }
    default:
      return { Icon: IconWorld, label: call.name }
  }
}

function tryParseArgs(s: string): Record<string, unknown> | null {
  if (!s) return null
  try {
    return JSON.parse(s) as Record<string, unknown>
  } catch {
    return null
  }
}

function hostname(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/.*$/, "")
}

/**
 * Allow only http(s) and mailto when opening a citation. The model can
 * emit any URL into a citation; the panel can't render unsafe schemes
 * directly but we still gate the open call so a tap can't deep-link
 * out of the app via `intent://`, `file://`, etc.
 */
function openSafeUrl(url: string): void {
  if (/^https?:\/\//i.test(url) || /^mailto:/i.test(url)) {
    void Linking.openURL(url)
  }
}
