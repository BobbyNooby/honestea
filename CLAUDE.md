# Honest AI — Working with this Repo

> Read [`honest-ai-business-plan.md`](honest-ai-business-plan.md) for product/strategy context and [`honest-ai-architecture.md`](honest-ai-architecture.md) for stack/security/auth/code conventions. Those two docs are the source of truth — this file is just operational notes.

## Repo layout

pnpm + Turborepo monorepo:

```
honestea/
├── apps/
│   ├── app/        Expo / React Native mobile app
│   ├── server/     Elysia.js API (auth, chat proxy, billing) — Bun runtime
│   └── web/        SvelteKit landing + account dashboard + admin
└── packages/
    └── shared/     Types, model registry, cost calc (consumed by all apps)
```

Internal package refs use `workspace:*`. All packages extend `tsconfig.base.json`.

## Common commands

```bash
pnpm install                        # install everything
pnpm dev                            # turbo runs all apps in parallel
pnpm --filter @honestea/app dev     # just the Expo app
pnpm --filter @honestea/web dev     # just the SvelteKit app
pnpm --filter @honestea/server dev  # just the Elysia API
pnpm typecheck                      # turbo typechecks all
pnpm build                          # turbo builds all
```

## Critical conventions

### Secret handling
- **`EXPO_PUBLIC_*` and `PUBLIC_*` env vars are bundled into client code — public.** Never put paid API keys here.
- Master Anthropic / OpenAI / Stripe / DB secrets live ONLY in `apps/server/.env` and the Railway/Fly deploy env. Never bundled.
- User BYOK API keys → `expo-secure-store` (Keychain/Keystore-encrypted), never `AsyncStorage`.
- See [`honest-ai-architecture.md`](honest-ai-architecture.md) §"API Key & Secret Management" for the full rules.

### Auth
- Better Auth lives in `apps/server`. Both web and mobile clients call it.
- Mobile: `@better-auth/expo` plugin + `expo-secure-store` for token storage.
- Web: `better-auth/svelte` against `https://api.honestai.app`.
- Sign in with Apple is required by App Store rules if any other social login exists; use `expo-apple-authentication` for the native flow.

### BYOK vs hosted
- Free Local tier: Expo calls Anthropic/etc. directly with the user's key. No backend.
- Paid tiers: Expo calls `apps/server` `/api/chat`; server uses master key.
- Client branches on `await SecureStore.getItemAsync(...)` — same chat code, different path.

### Pricing tiers
- Free Local (no account, BYOK only)
- Cloud BYOK ($5/mo) — account + sync, you bring keys
- Cloud + Credits — $5/mo + 25-30% markup credits via Stripe
- Subscription ($15/mo) — unlimited hosted tokens
- Mixed BYOK + hosted is allowed in paid tiers; the transparency UI labels each message accordingly

## Git conventions

### Commit messages
Use Conventional Commits prefixes:
- `feat:` — new feature
- `fix:` — bug fix
- `refactor:` — code change that doesn't add features or fix bugs
- `chore:` — tooling, config, deps, lockfiles
- `docs:` — documentation only
- `test:` — tests only
- `style:` — formatting, whitespace
- `perf:` — performance improvement

Use scopes when a commit is local to one workspace package: `feat(app):`, `feat(server):`, `feat(web):`, `feat(shared):`.

**Rules:**
- Subject line in lowercase, imperative mood ("add", not "added"/"adds"), no trailing period
- Keep subjects under ~72 chars
- No fancy descriptions, no marketing speak, no emoji
- **No `Co-Authored-By: Claude ...` trailers.** Don't add Claude's email to commit messages.
- No `🤖 Generated with Claude Code` lines
- If a body is needed, keep it terse — explain *why*, not *what*

Examples:
```
feat(app): add byok api key entry screen
fix(server): correct cost calc for prompt cache hits
refactor(shared): split model registry into per-provider files
chore: bump expo to sdk 55
docs: update phase 1 implementation order
```

### When to commit
- Each commit should be a logical, reviewable unit
- Split feature work across multiple commits when it touches distinct concerns (e.g. one commit per app/package being scaffolded)
- Don't commit lockfile changes alongside unrelated code unless the lockfile change is what the commit is about — group lockfile deltas into a `chore:` commit

## What NOT to do

- Don't put secrets in `EXPO_PUBLIC_*` / `PUBLIC_*` env vars
- Don't trust client-reported token usage for billing — calculate server-side from API response
- Don't use `AsyncStorage` for tokens or API keys (plaintext on disk)
- Don't add API routes to `apps/web` — all backend logic goes in `apps/server`
- Don't mock the database for integration tests; hit a real Postgres
- Don't run `expo prebuild` casually — it generates `ios/`/`android/` and breaks Expo Go workflow

## Phase 1 scope (current)

BYOK-only chat in Expo Go on a phone. No `apps/server` work, no `apps/web` work, no auth, no Stripe, no Supabase. The only goal is "I can talk to Claude in a chat app I built." See architecture doc §"Phase 1 Implementation Order" for the week-by-week breakdown.

## Useful links

- Expo docs: https://docs.expo.dev
- Better Auth + Expo: https://www.better-auth.com/docs/integrations/expo
- Elysia docs: https://elysiajs.com
- SvelteKit docs: https://kit.svelte.dev
- Turborepo docs: https://turbo.build/repo/docs
