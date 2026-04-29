import Constants from "expo-constants"
import { Platform } from "react-native"

const SERVER_PORT = 3001

/**
 * Resolves the API base URL based on how the app is being run.
 *
 * - Override with EXPO_PUBLIC_API_URL for staging / production.
 * - On a physical device via Expo Go: derive the host from the Expo manifest
 *   (same LAN IP that Metro is using) so the phone can reach the dev server.
 * - On the Android emulator: 10.0.2.2 maps to the host machine's localhost.
 * - Everywhere else (iOS sim, web): plain localhost.
 */
export function getApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL
  }

  const hostUri =
    Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost
  const host = hostUri?.split(":")[0]
  if (host) return `http://${host}:${SERVER_PORT}`

  if (Platform.OS === "android") return `http://10.0.2.2:${SERVER_PORT}`
  return `http://localhost:${SERVER_PORT}`
}

export type ChatRole = "user" | "assistant" | "system"

export interface ChatMessage {
  role: ChatRole
  content: string
}

/**
 * POSTs to /api/chat and streams the plain-text response. The server uses
 * Vercel AI SDK's `toTextStreamResponse()`, which sends raw text chunks
 * (not SSE / data-stream). We decode and forward each chunk to onToken.
 *
 * Returns the full assembled string when the stream ends.
 */
export async function streamChat(opts: {
  model: string
  messages: ChatMessage[]
  onToken: (chunk: string) => void
  signal?: AbortSignal
}): Promise<string> {
  const res = await fetch(`${getApiUrl()}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: opts.model, messages: opts.messages }),
    signal: opts.signal,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`)
  }
  if (!res.body) throw new Error("No response body to stream")

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ""

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    if (chunk) {
      full += chunk
      opts.onToken(chunk)
    }
  }
  return full
}
