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
  .listen(3001)

console.log(
  `🍵 honestea-server running at http://${app.server?.hostname}:${app.server?.port}`,
)
