import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"

import type { Conversation, SyncStatus } from "@honestea/shared"

import {
  createConversation,
  deleteConversation as repoDelete,
  listConversations,
  setConversationModel,
  setConversationStarred,
} from "./db/repository"
import { fetchCloudConversations, NO_AUTH } from "./sync/cloud-sync"

interface ConversationsState {
  /** Current chat being viewed. Null until the first chat is created. */
  currentId: string | null
  /** Merged local + cloud conversation list. Always non-null. */
  conversations: Conversation[]
  /** Refetch from DB + merge with cloud. Sidebar calls this on focus. */
  refresh: () => Promise<void>
  /** Background sync: fetch cloud rows and merge. Called on auth change. */
  sync: () => Promise<void>
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
  /** True while the first (or a manual) cloud fetch is in flight. */
  isLoadingCloud: boolean
  /** Non-null if the last cloud fetch errored. Resets on next success. */
  cloudError: Error | null
}

const Ctx = createContext<ConversationsState | null>(null)

/**
 * Derive a display-friendly SyncStatus from the raw DB columns.
 * Not persisted — computed on read so the logic lives in one place.
 */
function deriveSyncStatus(c: Conversation): SyncStatus {
  if (c.userId == null) return "local"
  if (c.syncedAt == null) return "syncing"
  // syncedAt is from the server; updatedAt is local. If local is newer,
  // the row has local changes not yet pushed.
  if (c.syncedAt < c.updatedAt) return "syncing"
  return "synced"
}

export function ConversationsProvider({ children }: { children: React.ReactNode }) {
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [localConversations, setLocalConversations] = useState<Conversation[]>([])
  const [cloudConversations, setCloudConversations] = useState<Conversation[]>([])
  const [isLoadingCloud, setIsLoadingCloud] = useState(false)
  const [cloudError, setCloudError] = useState<Error | null>(null)
  const syncInFlight = useRef(false)

  // ── Merge ─────────────────────────────────────────────────────────
  const conversations = useMemo(() => {
    const map = new Map<string, Conversation>()

    // Local rows first.
    for (const c of localConversations) {
      map.set(c.id, { ...c, syncStatus: deriveSyncStatus(c) })
    }

    // Cloud rows override when newer or missing.
    for (const c of cloudConversations) {
      const existing = map.get(c.id)
      if (!existing || (c.updatedAt ?? 0) >= (existing.updatedAt ?? 0)) {
        map.set(c.id, { ...c, syncStatus: deriveSyncStatus(c) })
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      // Starred first, then recency.
      if (a.starred !== b.starred) return (b.starred ? 1 : 0) - (a.starred ? 1 : 0)
      return (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
    })
  }, [localConversations, cloudConversations])

  // ── Refresh local ─────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    const rows = await listConversations()
    setLocalConversations(rows)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // ── Cloud sync ─────────────────────────────────────────────────────
  const sync = useCallback(async () => {
    if (syncInFlight.current) return
    syncInFlight.current = true
    setIsLoadingCloud(true)
    setCloudError(null)

    try {
      // TODO(Epic 4): read real auth token from SecureStore / Better Auth.
      const token = ""
      const result = await fetchCloudConversations({ token })
      if (result !== NO_AUTH) {
        setCloudConversations(result.conversations)
      } else {
        setCloudConversations([])
      }
    } catch (e) {
      setCloudError(e instanceof Error ? e : new Error("Cloud sync failed"))
    } finally {
      setIsLoadingCloud(false)
      syncInFlight.current = false
    }
  }, [])

  // TODO(Epic 4): auto-sync when auth state flips to authenticated.
  // useEffect(() => {
  //   const unsub = authClient.onSessionChange((session) => {
  //     if (session) sync()
  //     else setCloudConversations([])
  //   })
  //   return unsub
  // }, [sync])

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

  const value: ConversationsState = {
    currentId,
    conversations,
    refresh,
    sync,
    startNew,
    select,
    remove,
    updateCurrentModel,
    setStarred,
    isLoadingCloud,
    cloudError,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useConversations(): ConversationsState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useConversations used outside ConversationsProvider")
  return ctx
}
