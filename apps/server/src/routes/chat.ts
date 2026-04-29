import { Elysia, t } from "elysia"
import { streamText } from "ai"
import { getModel } from "../providers"

export const chatRoutes = new Elysia().post(
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
