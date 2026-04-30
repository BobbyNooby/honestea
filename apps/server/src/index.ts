import { Elysia, t } from "elysia"
import { cors } from "@elysiajs/cors"
import { streamText } from "ai"
import { dim, methodColors, red, reset, statusColor } from "./logger"
import { getModel } from "./providers"

// ----------------------------------------------------------------------------
// Model catalog cache. Hits OpenRouter's public /api/v1/models endpoint, caches
// the result in memory for 24h. Pricing in the response includes OpenRouter's
// ~5% markup; close enough for "estimated cost" UI on direct-provider keys too.
// ----------------------------------------------------------------------------

interface ModelEntry {
  id: string
  name: string
  context_length: number
  architecture?: { modality?: string }
  pricing: {
    prompt: string
    completion: string
    image?: string
    request?: string
  }
  top_provider?: { context_length?: number; max_completion_tokens?: number }
}

const MODELS_CACHE_TTL_MS = 24 * 60 * 60 * 1000
let modelsCache: ModelEntry[] | null = null
let cachedAt = 0
let inFlight: Promise<ModelEntry[]> | null = null

async function fetchOpenrouterModels(): Promise<ModelEntry[]> {
  const res = await fetch("https://openrouter.ai/api/v1/models")
  if (!res.ok) throw new Error(`OpenRouter /models HTTP ${res.status}`)
  const json = (await res.json()) as { data: ModelEntry[] }
  return json.data
}

async function getModelsCached(): Promise<ModelEntry[]> {
  const fresh = modelsCache && Date.now() - cachedAt < MODELS_CACHE_TTL_MS
  if (fresh && modelsCache) return modelsCache
  if (inFlight) return inFlight

  inFlight = fetchOpenrouterModels()
    .then((data) => {
      modelsCache = data
      cachedAt = Date.now()
      return data
    })
    .finally(() => {
      inFlight = null
    })
  return inFlight
}

const app = new Elysia()
  .derive(({ request }) => ({
    startTime: performance.now(),
    ip:
      request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip") ??
      "local",
  }))
  .onAfterResponse(({ request, startTime, ip, set }) => {
    const ms = (performance.now() - startTime).toFixed(1)
    const url = new URL(request.url)
    const method = request.method
    const color = methodColors[method] ?? reset
    const status = Number(set.status) || 200
    console.log(
      `${color}${method.padEnd(7)}${reset} ${url.pathname}${dim}${url.search || ""}${reset} ${statusColor(status)}${status}${reset} ${dim}${ms}ms${reset} ${dim}[${ip}]${reset}`,
    )
  })
  .onError(({ request, error, startTime, ip }) => {
    const ms = startTime ? (performance.now() - startTime).toFixed(1) : "?"
    const url = new URL(request.url)
    const msg = "message" in error ? error.message : String(error)
    console.error(
      `${red}ERROR${reset}   ${url.pathname} ${red}${msg}${reset} ${dim}${ms}ms${reset} ${dim}[${ip}]${reset}`,
    )
  })
  .use(
    cors({
      origin: [
        "https://honestai.app",
        "http://localhost:5173",
        "http://localhost:8081",
      ],
      credentials: true,
      allowedHeaders: ["content-type", "x-byok-openrouter"],
    }),
  )
  .get("/", () => ({ ok: true, service: "honestea-server" }))
  .get("/health", () => ({ status: "ok", uptime: process.uptime() }))
  .get("/beep", () => ({
    message: "boop! the api is alive — edit me in apps/server/src/index.ts",
    serverTime: new Date().toISOString(),
  }))
  .get("/api/models", async () => {
    const data = await getModelsCached()
    return { data, cachedAt }
  })
  .post(
    "/api/chat",
    ({ body, request }) => {
      const { model, messages } = body
      const byokKey = request.headers.get("x-byok-openrouter") ?? undefined
      const result = streamText({
        model: getModel(model, byokKey),
        messages,
      })
      return result.toTextStreamResponse()
    },
    {
      body: t.Object({
        model: t.String(),
        messages: t.Array(
          t.Object({
            role: t.Union([
              t.Literal("user"),
              t.Literal("assistant"),
              t.Literal("system"),
            ]),
            content: t.String(),
          }),
        ),
      }),
    },
  )
  .listen(3001)

console.log(
  `🍵 honestea-server running at http://${app.server?.hostname}:${app.server?.port}`,
)
