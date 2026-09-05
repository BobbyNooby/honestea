# HonesTea — Working with this Repo

A local-first, BYOK (bring-your-own-key) AI chat harness for Android/iOS,
built with Expo. There is no server, no accounts, no billing, and no
telemetry — chats, API keys, and settings never leave the device.

## Repo layout

pnpm + Turborepo monorepo:

```
honestea/
├── apps/
│   └── app/        Expo / React Native app (SDK 57) — the whole product
└── packages/
    └── shared/     Types, cost math, curated models, Auto routing engine
```

Internal package refs use `workspace:*`. All packages extend `tsconfig.base.json`.

## Architecture in one paragraph

OpenRouter is the only provider path: one key, every model, and its
`/api/v1/models` endpoint is the live price oracle (free, no auth). The
model registry (`apps/app/lib/model/model-registry.ts`) fetches it with a
configurable TTL + offline fallback. Chats stream over SSE from
`lib/api/openrouter.ts` (hand-parsed, 1MB framing guard). SQLite via
expo-sqlite + Drizzle is the only store; the ladder in `lib/db/index.ts`
is hand-mirrored, idempotent, and runs on every launch. API keys live in
expo-secure-store (Keychain/Keystore), never AsyncStorage. The "Auto"
model entry resolves each send to the cheapest capable model via
`packages/shared/src/routing.ts` (pure, vitest-covered).

## Common commands

```bash
pnpm install      # install (pnpm 11 — see allowBuilds in pnpm-workspace.yaml)
pnpm dev:app      # Expo dev server (scan QR with Expo Go)
pnpm test         # vitest — pure logic in packages/shared
pnpm typecheck    # tsc over the workspace
pnpm lint         # eslint (expo config, flat)
```

Native builds (release APK): `npx expo prebuild -p android` then
`cd apps/app/android && ./gradlew assembleRelease` — needs ANDROID_HOME +
JDK 17–21. CI does this on every push to `main`.

## Rules of the road

- OpenRouter-only by design. The removed direct-provider paths
  (Anthropic/OpenAI/Google native streamers) are not coming back without
  an explicit product decision.
- No implicit paid LLM calls. Title-gen and compaction deliberately map
  the "auto" sentinel to a concrete cheap model; don't add calls that run
  on every send without asking.
- New effects must setState only in async continuations —
  `react-hooks/set-state-in-effect` is an error in lint (SDK 57 rules).
- Keep the curated model list verified: `npx tsx scripts/verify-curated.ts`
  checks every slug against the live catalog.
- `pnpm-workspace.yaml` `allowBuilds` must list esbuild/unrs-resolver as
  real booleans — pnpm 11 writes placeholder strings there if you let it,
  which hard-fails every script run.

## History note

Business-plan/strategy docs from the original "AI platform" concept and
the superpowers planning docs were purged from git history (git
filter-repo). Don't reintroduce business, billing, cloud-sync, or
account surfaces — the product is intentionally a local tool.
