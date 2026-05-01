import Constants from "expo-constants"
import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Thin wrapper around `@jamsch/expo-speech-recognition` for the
 * composer's mic affordance. Tap to start: results stream as the user
 * speaks. Tap again (or auto on silence) to stop.
 *
 * Expo Go does not bundle this third-party native module — calling into
 * it there would throw. We detect Expo Go via `Constants.appOwnership`
 * and switch the exported hook to a no-op stub at module init time. The
 * stub returns `available: false` so the mic button renders disabled
 * and nothing else is touched.
 *
 * Once the user runs `pnpm run:android` (or builds via EAS) the dev
 * client picks up the real native module and the hook implementation
 * activates automatically.
 */

const isExpoGo = Constants.appOwnership === "expo"

interface SpeechRecognitionState {
  available: boolean
  recording: boolean
  interim: string
  error: string | null
  start: () => Promise<void>
  stop: () => void
}

const STUB_STATE: SpeechRecognitionState = {
  available: false,
  recording: false,
  interim: "",
  error: null,
  start: async () => {},
  stop: () => {},
}

interface SpeechRecognitionOptions {
  onTranscript: (text: string) => void
  /** BCP-47 locale tag, e.g. "en-US". Defaults to device locale. */
  locale?: string
}

/**
 * Stub used in Expo Go where the native module isn't available. Returns
 * a frozen state object with `available: false`. Not a hook (no React
 * state) — the consumer treats it identically to the real hook because
 * the return shape matches.
 */
function speechRecognitionStub(
  _opts: SpeechRecognitionOptions,
): SpeechRecognitionState {
  return STUB_STATE
}

function useNativeSpeechRecognition(
  opts: SpeechRecognitionOptions,
): SpeechRecognitionState {
  // Lazy require — only resolves outside Expo Go so the package's
  // module init never runs there.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const speech =
    require("@jamsch/expo-speech-recognition") as typeof import("@jamsch/expo-speech-recognition")

  // We deliberately don't gate on `supportsRecording()` here — that
  // function returns true only on Android 13+ (Tiramisu) because it's
  // actually checking *on-device* recognition support. Older Androids
  // still have working cloud-based STT via SpeechRecognizer; iOS always
  // works. Setting available=true and letting `start()` surface the real
  // error if the platform lacks any STT engine gives more permissive +
  // honest UX than silently greying the button on most phones.
  const [available] = useState(() => true)
  const [recording, setRecording] = useState(false)
  const [interim, setInterim] = useState("")
  const [error, setError] = useState<string | null>(null)
  const cbRef = useRef(opts.onTranscript)
  useEffect(() => {
    cbRef.current = opts.onTranscript
  }, [opts.onTranscript])

  speech.useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results?.[0]?.transcript ?? ""
    if (event.isFinal) {
      if (transcript.trim().length > 0) cbRef.current(transcript)
      setInterim("")
    } else {
      setInterim(transcript)
    }
  })

  speech.useSpeechRecognitionEvent("error", (event) => {
    setError(event.message ?? event.error ?? "Speech recognition error")
    setRecording(false)
    setInterim("")
  })

  speech.useSpeechRecognitionEvent("end", () => {
    setRecording(false)
    setInterim("")
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
    try {
      speech.ExpoSpeechRecognitionModule.start({
        lang: opts.locale ?? "en-US",
        interimResults: true,
        continuous: false,
      })
      setRecording(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start recording.")
      setRecording(false)
    }
  }, [available, opts.locale, speech])

  const stop = useCallback(() => {
    try {
      speech.ExpoSpeechRecognitionModule.stop()
    } catch {
      // Best effort — module throws if already stopped.
    }
    setRecording(false)
  }, [speech])

  return { available, recording, interim, error, start, stop }
}

/**
 * Resolved at module init: the stub when running inside Expo Go, the
 * real implementation otherwise. Both share the same return shape so
 * consumers don't branch.
 */
export const useSpeechRecognition: (
  opts: SpeechRecognitionOptions,
) => SpeechRecognitionState = isExpoGo
  ? speechRecognitionStub
  : useNativeSpeechRecognition
