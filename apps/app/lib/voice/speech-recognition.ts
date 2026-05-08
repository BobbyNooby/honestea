import Constants from "expo-constants"
import * as FileSystem from "expo-file-system/legacy"
import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Two-phase voice input:
 *
 *   1. **recording** — live STT runs against the mic with
 *      `recordingOptions.persist: true` so a wav/caf file accumulates
 *      alongside. Most utterances finish with the engine emitting a
 *      final transcript and we just commit it.
 *   2. **transcribing** — when the user taps ✓ before the engine has
 *      emitted anything (common on quick "yes"/"no" / sub-1s clips),
 *      we have no live transcript to commit. Fall back to running the
 *      same recognizer in offline mode against the saved audio file
 *      via `audioSource: { uri }`. Adds ~1s post-tap latency but
 *      handles utterances of any length reliably.
 *
 * Audio file is deleted on every exit path (success, abort, error) —
 * never persisted across sessions.
 *
 * Expo Go does not bundle this third-party native module — calling
 * into it there would throw. We detect Expo Go via
 * `Constants.appOwnership` and switch the exported hook to a no-op
 * stub at module init time.
 */

const isExpoGo = Constants.appOwnership === "expo"

type Phase = "idle" | "recording" | "transcribing"

interface SpeechRecognitionState {
  available: boolean
  recording: boolean
  /** True while the offline file pass is running (post-stop, ~1s).
   *  UI uses this to swap the recording pill into a "transcribing"
   *  state with a spinner. */
  transcribing: boolean
  interim: string
  error: string | null
  start: () => Promise<void>
  stop: () => void
  abort: () => void
}

const STUB_STATE: SpeechRecognitionState = {
  available: false,
  recording: false,
  transcribing: false,
  interim: "",
  error: null,
  start: async () => {},
  stop: () => {},
  abort: () => {},
}

interface SpeechRecognitionOptions {
  onTranscript: (text: string) => void
  /** BCP-47 locale tag, e.g. "en-US". Defaults to the device locale. */
  locale?: string
}

function speechRecognitionStub(
  _opts: SpeechRecognitionOptions,
): SpeechRecognitionState {
  return STUB_STATE
}

function useNativeSpeechRecognition(
  opts: SpeechRecognitionOptions,
): SpeechRecognitionState {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const speech =
    require("@jamsch/expo-speech-recognition") as typeof import("@jamsch/expo-speech-recognition")

  const [available] = useState(() => true)
  const [phase, setPhase] = useState<Phase>("idle")
  const [interim, setInterim] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Refs read by event handlers (which capture stale state otherwise).
  const phaseRef = useRef<Phase>(phase)
  phaseRef.current = phase
  const cbRef = useRef(opts.onTranscript)
  useEffect(() => {
    cbRef.current = opts.onTranscript
  }, [opts.onTranscript])

  const audioFileRef = useRef<string | null>(null)
  const latestInterimRef = useRef("")
  const finalFiredRef = useRef(false)

  /** Delete the persisted audio clip and reset session refs. Idempotent. */
  const cleanup = useCallback(() => {
    const uri = audioFileRef.current
    audioFileRef.current = null
    finalFiredRef.current = false
    latestInterimRef.current = ""
    setInterim("")
    if (uri) {
      FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {
        // Best effort — cache files get cleaned by OS anyway.
      })
    }
  }, [])

  speech.useSpeechRecognitionEvent("result", (event) => {
    const text = event.results?.[0]?.transcript ?? ""
    if (event.isFinal) {
      finalFiredRef.current = true
      if (text.trim().length > 0) cbRef.current(text)
      latestInterimRef.current = ""
      setInterim("")
    } else {
      latestInterimRef.current = text
      setInterim(text)
    }
  })

  speech.useSpeechRecognitionEvent("audioend", (event) => {
    // Captures the path the recognizer wrote the audio to. We can't
    // touch this file before this event fires. Stash for the file pass.
    if (phaseRef.current === "recording" && event.uri) {
      audioFileRef.current = event.uri
    }
  })

  speech.useSpeechRecognitionEvent("end", () => {
    const current = phaseRef.current
    if (current === "recording") {
      // Live session ended (user stopped or recognizer finished).
      // Decide whether to commit the live transcript or fall back to
      // re-running against the saved file.
      if (finalFiredRef.current) {
        // Already committed in the result handler.
        cleanup()
        setPhase("idle")
        return
      }
      const buffered = latestInterimRef.current.trim()
      if (buffered.length > 0) {
        cbRef.current(buffered)
        cleanup()
        setPhase("idle")
        return
      }
      // No live transcript — try the saved file.
      const uri = audioFileRef.current
      if (!uri) {
        cleanup()
        setPhase("idle")
        return
      }
      // Reset session flags before starting the file pass.
      finalFiredRef.current = false
      latestInterimRef.current = ""
      setPhase("transcribing")
      try {
        speech.ExpoSpeechRecognitionModule.start({
          audioSource: { uri },
          interimResults: false,
          continuous: false,
          lang: opts.locale ?? deviceLocale(),
        })
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Failed to transcribe clip.",
        )
        cleanup()
        setPhase("idle")
      }
    } else if (current === "transcribing") {
      // File pass ended. If a final fired, transcript was already
      // committed via the result handler. If not, the file produced
      // nothing — silently give up rather than spam the user.
      cleanup()
      setPhase("idle")
    }
  })

  speech.useSpeechRecognitionEvent("error", (event) => {
    setError(event.message ?? event.error ?? "Speech recognition error")
    cleanup()
    setPhase("idle")
  })

  const start = useCallback(async () => {
    if (!available) {
      setError("Speech recognition not available on this device.")
      return
    }
    setError(null)
    const perm =
      await speech.ExpoSpeechRecognitionModule.requestPermissionsAsync()
    if (!perm.granted) {
      setError("Microphone permission is required to use voice input.")
      return
    }
    finalFiredRef.current = false
    latestInterimRef.current = ""
    audioFileRef.current = null
    try {
      speech.ExpoSpeechRecognitionModule.start({
        lang: opts.locale ?? deviceLocale(),
        interimResults: true,
        // Recognizer keeps listening until WE stop it. Without this it
        // self-terminates on silence and clips short utterances.
        continuous: true,
        // Persist the audio so we have a fallback to transcribe offline
        // if the live pass produced no transcript at all.
        recordingOptions: { persist: true },
      })
      setPhase("recording")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start recording.")
      setPhase("idle")
    }
  }, [available, opts.locale, speech])

  const stop = useCallback(() => {
    if (phaseRef.current !== "recording") return
    try {
      speech.ExpoSpeechRecognitionModule.stop()
    } catch {
      // Best effort — module throws if already stopped.
    }
    // The `end` event handler above takes it from here: commits live
    // transcript if present, otherwise transitions to `transcribing`.
  }, [speech])

  const abort = useCallback(() => {
    // Cancel without committing. Suppress any pending final result so
    // the result handler doesn't fire onTranscript on a queued event.
    finalFiredRef.current = true
    latestInterimRef.current = ""
    try {
      speech.ExpoSpeechRecognitionModule.abort()
    } catch {
      // Best effort — module throws if already stopped.
    }
    cleanup()
    setPhase("idle")
  }, [speech, cleanup])

  return {
    available,
    recording: phase === "recording",
    transcribing: phase === "transcribing",
    interim,
    error,
    start,
    stop,
    abort,
  }
}

/**
 * Read the device's BCP-47 locale tag from `Intl`. Falls back to en-US
 * when the runtime doesn't expose it (rare on Hermes / modern RN).
 */
function deviceLocale(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale
  } catch {
    return "en-US"
  }
}

export const useSpeechRecognition: (
  opts: SpeechRecognitionOptions,
) => SpeechRecognitionState = isExpoGo
  ? speechRecognitionStub
  : useNativeSpeechRecognition
