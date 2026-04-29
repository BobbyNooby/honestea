import { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { getApiUrl } from "@/lib/api"

interface BeepResponse {
  message: string
  serverTime: string
}

export default function HomeScreen() {
  const apiUrl = getApiUrl()
  const [data, setData] = useState<BeepResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchBeep = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${apiUrl}/beep`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as BeepResponse
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown error")
    } finally {
      setLoading(false)
    }
  }, [apiUrl])

  useEffect(() => {
    void fetchBeep()
  }, [fetchBeep])

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedView style={styles.section}>
          <ThemedText type="title">Beep test</ThemedText>
          <ThemedText>
            Round-trips to the local Elysia server. Edit{" "}
            <ThemedText type="defaultSemiBold">
              apps/server/src/index.ts
            </ThemedText>{" "}
            and refresh — the response below should change.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="defaultSemiBold">Endpoint</ThemedText>
          <ThemedText style={styles.mono}>{apiUrl}/beep</ThemedText>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="defaultSemiBold">Response</ThemedText>
          {loading && <ActivityIndicator />}
          {error && (
            <ThemedText style={styles.error}>error: {error}</ThemedText>
          )}
          {data && !loading && (
            <>
              <ThemedText>{data.message}</ThemedText>
              <ThemedText style={styles.dim}>at {data.serverTime}</ThemedText>
            </>
          )}
        </ThemedView>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            loading && styles.buttonDisabled,
          ]}
          onPress={fetchBeep}
          disabled={loading}
        >
          <ThemedText type="defaultSemiBold" style={styles.buttonText}>
            {loading ? "fetching…" : "refresh"}
          </ThemedText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 24, gap: 24 },
  section: { gap: 8 },
  mono: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 13,
  },
  error: { color: "#dc2626" },
  dim: { opacity: 0.6, fontSize: 13 },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#3b82f6",
  },
  buttonPressed: { opacity: 0.7 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff" },
})
