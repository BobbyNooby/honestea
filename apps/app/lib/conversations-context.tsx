import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

import type { Conversation } from "@honestea/shared"

import {
  createConversation,
  deleteConversation as repoDelete,
  listConversations,
  setConversationModel,
  setConversationStarred,
} from "./db/repository"

interface ConversationsState {
  /** Current chat being viewed. Null until the first chat is created. */
  currentId: string | null
  /** Local conversation list, starred first then recency. Always non-null. */
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
  /** Toggle the star/pin flag on a conversation. */
  setStarred: (id: string, starred: boolean) => Promise<void>
}

const Ctx = createContext<ConversationsState | null>(null)

export function ConversationsProvider({ children }: { children: React.ReactNode }) {
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])

  // ── Refresh local ─────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    const rows = await listConversations()
    // Starred first, then recency.
    rows.sort((a, b) => {
      if (a.starred !== b.starred) return (b.starred ? 1 : 0) - (a.starred ? 1 : 0)
      return (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
    })
    setConversations(rows)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // ── Mutations ───────────────────────────────────────────────────────
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

  const setStarred = useCallback(
    async (id: string, starred: boolean) => {
      await setConversationStarred(id, starred)
      await refresh()
    },
    [refresh],
  )

  const value = useMemo<ConversationsState>(
    () => ({
      currentId,
      conversations,
      refresh,
      startNew,
      select,
      remove,
      updateCurrentModel,
      setStarred,
    }),
    [currentId, conversations, refresh, startNew, select, remove, updateCurrentModel, setStarred],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useConversations(): ConversationsState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useConversations used outside ConversationsProvider")
  return ctx
}
