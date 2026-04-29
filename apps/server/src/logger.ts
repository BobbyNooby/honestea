/**
 * Tiny ANSI logger helpers — used by the Elysia lifecycle hooks in index.ts and
 * by future WebSocket handlers. Mirrors the format used by the OpenMarket server.
 *
 *   GET     /beep                 200 0.5ms [local]
 *   POST    /api/chat             401 1.2ms [192.168.1.5]
 *   ERROR   /broken Cannot find user  12.3ms [local]
 *   WS      connected    [user_xyz]
 *   WS      disconnected [user_xyz]
 */

export const methodColors: Record<string, string> = {
  GET: "\x1b[32m", // green
  POST: "\x1b[34m", // blue
  PUT: "\x1b[33m", // yellow
  PATCH: "\x1b[33m", // yellow
  DELETE: "\x1b[31m", // red
  OPTIONS: "\x1b[90m", // gray
}

export const reset = "\x1b[0m"
export const dim = "\x1b[90m"
export const red = "\x1b[31m"
export const green = "\x1b[32m"
export const cyan = "\x1b[36m"
export const magenta = "\x1b[35m"

export function statusColor(status: number): string {
  if (status >= 400) return red
  if (status >= 300) return cyan
  return green
}

export function logWsConnect(id: string): void {
  console.log(`${magenta}WS${reset}      ${green}connected${reset} ${dim}[${id}]${reset}`)
}

export function logWsDisconnect(id: string): void {
  console.log(`${magenta}WS${reset}      ${red}disconnected${reset} ${dim}[${id}]${reset}`)
}

export function logWsMessage(id: string, kind: string): void {
  console.log(
    `${magenta}WS${reset}      ${dim}${kind.padEnd(11)}${reset} ${dim}[${id}]${reset}`,
  )
}
