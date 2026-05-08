import { fetch as expoFetch } from "expo/fetch"

import { createClient, type HonesTeaClient } from "@honestea/shared/client"

/**
 * Singleton API client. Uses expo/fetch so SSE streaming works in
 * Expo Go (RN's global fetch doesn't expose ReadableStream).
 *
 * Import this instead of calling fetch() directly — when auth lands,
 * the token gets injected here in one place.
 */
export const client: HonesTeaClient = createClient({ fetch: expoFetch })