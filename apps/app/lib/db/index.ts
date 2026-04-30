import { drizzle } from "drizzle-orm/expo-sqlite"
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator"
import { openDatabaseSync } from "expo-sqlite"

import migrations from "../../drizzle/migrations"
import * as schema from "./schema"

/**
 * Synchronous SQLite handle. Opened lazily and reused across the app.
 * Eq's `enableChangeListener: true` so we can subscribe to row changes
 * via `useLiveQuery` from drizzle (handy for the conversation list).
 */
const sqlite = openDatabaseSync("honestea.db", {
  enableChangeListener: true,
})

export const db = drizzle(sqlite, { schema })

export type Db = typeof db

export function useRunMigrations() {
  return useMigrations(db, migrations)
}
