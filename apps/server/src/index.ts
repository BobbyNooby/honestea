import { Elysia } from "elysia"
import { cors } from "@elysiajs/cors"
import { dim, methodColors, red, reset, statusColor } from "./logger"
import { chatRoutes } from "./routes/chat"

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
  .use(chatRoutes)
  .listen(3001)

console.log(
  `🍵 honestea-server running at http://${app.server?.hostname}:${app.server?.port}`,
)
