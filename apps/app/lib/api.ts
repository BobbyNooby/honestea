import Constants from "expo-constants"
import { Platform } from "react-native"

const SERVER_PORT = 3001

/**
 * Resolves the API base URL based on how the app is being run.
 *
 * - Override with EXPO_PUBLIC_API_URL for staging / production.
 * - On a physical device via Expo Go: derive the host from the Expo manifest
 *   (same LAN IP that Metro is using) so the phone can reach the dev server.
 * - On the Android emulator: 10.0.2.2 maps to the host machine's localhost.
 * - Everywhere else (iOS sim, web): plain localhost.
 */
export function getApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL
  }

  const hostUri =
    Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost
  const host = hostUri?.split(":")[0]
  if (host) return `http://${host}:${SERVER_PORT}`

  if (Platform.OS === "android") return `http://10.0.2.2:${SERVER_PORT}`
  return `http://localhost:${SERVER_PORT}`
}
