import * as Speech from "expo-speech"
import { useCallback, useEffect, useState } from "react"

/**
 * Single-active-message TTS state shared across the app. Only one message
 * can be speaking at a time — starting a new one stops the old.
 *
 * Module-scoped state so multiple components (e.g. each MessageActions row)
 * can read/subscribe to the active id without re-instantiating the player.
 */

let activeId: string | null = null
const listeners = new Set<(id: string | null) => void>()

function broadcast(next: string | null) {
  activeId = next
  for (const l of listeners) l(next)
}

export function useSpeech() {
  const [speakingId, setSpeakingId] = useState<string | null>(activeId)

  useEffect(() => {
    listeners.add(setSpeakingId)
    return () => {
      listeners.delete(setSpeakingId)
    }
  }, [])

  const speak = useCallback((id: string, text: string) => {
    Speech.stop()
    if (!text.trim()) return
    broadcast(id)
    Speech.speak(text, {
      onDone: () => {
        if (activeId === id) broadcast(null)
      },
      onStopped: () => {
        if (activeId === id) broadcast(null)
      },
      onError: () => {
        if (activeId === id) broadcast(null)
      },
    })
  }, [])

  const stop = useCallback(() => {
    Speech.stop()
    broadcast(null)
  }, [])

  const toggle = useCallback(
    (id: string, text: string) => {
      if (activeId === id) stop()
      else speak(id, text)
    },
    [speak, stop],
  )

  return { speakingId, speak, stop, toggle }
}
