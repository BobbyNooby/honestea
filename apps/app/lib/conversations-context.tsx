import { createContext, useCallback, useContext, useEffect, useState } from "react"

import type { Conversation } from "@honestea/shared"

import {
  createConversation,
  deleteConversation as repoDelete,
  listConversations,
  setConversationModel,
} from "./db/repository"

interface ConversationsState {
  /** Current chat being viewed. Null until the first chat is created. */
  currentId: string | null
  /** Latest known list, refreshed on demand. */
  conversations: Conversation[]
  /** Refetch from DB. Sidebar calls this on focus. */
  refresh: () => Promise<void>
  /** Create a new conversation with the given model and switch to it. */
  startNew: (modelId: string) => Promise<string>
  /** Switch to an existing conversation. */
  select: (id: string) => void
  /** Delete and (if it was current) clear the selection. */
  remove: (id: string) => Promise<void>
  /** Persist a model change for the current conversation. */
  updateCurrentModel: (modelId: string) => Promise<void>
}

const Ctx = createContext<ConversationsState | null>(null)

export function ConversationsProvider({ children }: { children: React.ReactNode }) {
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])

  const refresh = useCallback(async () => {
    const rows = await listConversations()
    setConversations(rows)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const startNew = useCallback(
    async (modelId: string) => {
      const convo = await createConversation({ modelId })
      setCurrentId(convo.id)
      await refresh()
      return convo.id
    },
    [refresh],
  )

  const select = useCallback((id: string) => {
    setCurrentId(id)
  }, [])

  const remove = useCallback(
    async (id: string) => {
      await repoDelete(id)
      setCurrentId((curr) => (curr === id ? null : curr))
      await refresh()
    },
    [refresh],
  )

  const updateCurrentModel = useCallback(
    async (modelId: string) => {
      if (!currentId) return
      await setConversationModel(currentId, modelId)
      await refresh()
    },
    [currentId, refresh],
  )

  const value: ConversationsState = {
    currentId,
    conversations,
    refresh,
    startNew,
    select,
    remove,
    updateCurrentModel,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useConversations(): ConversationsState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useConversations used outside ConversationsProvider")
  return ctx
}
