import {
  ExpoSpeechRecognitionModule,
  supportsRecording,
  useSpeechRecognitionEvent,
} from "@jamsch/expo-speech-recognition"
import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Thin wrapper around `@jamsch/expo-speech-recognition` for the
 * composer's mic affordance. Tap to start: results stream as the user
 * speaks. Tap again (or auto on silence) to stop.
 *
 * Notes for the curious:
 *  - Expo Go on Android does not include the SpeechRecognizer service,
 *    so this hook returns `available: false` there. iOS Expo Go works.
 *    Production / dev builds work on both platforms.
 *  - We only emit `onTranscript` for the *final* portion of the latest
 *    utterance — not interim results — so the composer doesn't
 *    flicker. Interim text lives in `interim` for an inline preview.
 */
export function useSpeechRecognition(opts: {
  onTranscript: (text: string) => void
  /** BCP-47 locale tag, e.g. "en-US". Defaults to device locale. */
  locale?: string
}) {
  const [available] = useState(() => supportsRecording())
  const [recording, setRecording] = useState(false)
  const [interim, setInterim] = useState("")
  const [error, setError] = useState<string | null>(null)
  // Live ref to the latest onTranscript so the event subscriptions
  // don't have to re-bind on every parent render.
  const cbRef = useRef(opts.onTranscript)
  useEffect(() => {
    cbRef.current = opts.onTranscript
  }, [opts.onTranscript])

  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results?.[0]?.transcript ?? ""
    if (event.isFinal) {
      if (transcript.trim().length > 0) cbRef.current(transcript)
      setInterim("")
    } else {
      setInterim(transcript)
    }
  })

  useSpeechRecognitionEvent("error", (event) => {
    setError(event.message ?? event.error ?? "Speech recognition error")
    setRecording(false)
    setInterim("")
  })

  useSpeechRecognitionEvent("end", () => {
    setRecording(false)
    setInterim("")
  })

  const start = useCallback(async () => {
    if (!available) {
      setError("Speech recognition not available on this device.")
      return
    }
    setError(null)
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync()
    if (!perm.granted) {
      setError("Microphone permission is required to use voice input.")
      return
    }
    try {
      ExpoSpeechRecognitionModule.start({
        lang: opts.locale ?? "en-US",
        interimResults: true,
        continuous: false,
      })
      setRecording(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start recording.")
      setRecording(false)
    }
  }, [available, opts.locale])

  const stop = useCallback(() => {
    try {
      ExpoSpeechRecognitionModule.stop()
    } catch {
      // Best effort — module throws if already stopped.
    }
    setRecording(false)
  }, [])

  return { available, recording, interim, error, start, stop }
}
