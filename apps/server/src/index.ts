import { Elysia, t } from "elysia"
import { cors } from "@elysiajs/cors"
import { streamText } from "ai"
import { dim, methodColors, red, reset, statusColor } from "./logger"
import { getModel } from "./providers"

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
    }),
  )
  .get("/", () => ({ ok: true, service: "honestea-server" }))
  .get("/health", () => ({ status: "ok", uptime: process.uptime() }))
  .get("/beep", () => ({
    message: "boop! the api is alive — edit me in apps/server/src/index.ts",
    serverTime: new Date().toISOString(),
  }))
  .post(
    "/api/chat",
    ({ body }) => {
      const { model, messages } = body
      const result = streamText({
        model: getModel(model),
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
