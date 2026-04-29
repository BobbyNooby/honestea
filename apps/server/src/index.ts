import { Elysia } from "elysia"
import { cors } from "@elysiajs/cors"

const app = new Elysia()
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
  .listen(3001)

console.log(
  `🍵 honestea-server running at http://${app.server?.hostname}:${app.server?.port}`,
)
