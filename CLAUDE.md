# Honest AI — Working with this Repo

> Three source-of-truth docs:
> - [`honest-ai-business-plan.md`](honest-ai-business-plan.md) — product/strategy/pricing/marketing
> - [`honest-ai-architecture.md`](honest-ai-architecture.md) — stack/security/auth/code conventions for current phase
> - [`honest-ai-scaling.md`](honest-ai-scaling.md) — migration playbook + cost optimization for Stage 1+ (when MRR triggers warrant building proprietary)
>
> This file is just operational notes.

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
pnpm install      # install everything
pnpm dev          # mprocs — all three apps in panes (Expo QR code renders here)
pnpm dev:app      # just Expo standalone
pnpm dev:server   # just Elysia (Bun runtime)
pnpm dev:web      # just SvelteKit
pnpm typecheck    # turbo typechecks all in parallel
pnpm build        # turbo builds all
```

`pnpm dev` runs mprocs (not turbo) because Turbo's TUI mangles Expo's QR-code ANSI output. mprocs uses real PTYs per process so interactive output renders correctly.

## Known sharp edges

### pnpm + Metro: silently dropped npm-aliases

pnpm 10's `nodeLinker: hoisted` has a bug where transitive deps using npm-alias syntax (e.g. `"@foo/bar--for-generate-function-map": "npm:@foo/bar@^7"`) get dropped during resolution — they're never even written to the lockfile, never installed in `node_modules/`. Metro then crashes at startup with `Cannot find module '<pkg>'`.

Symptom: `Error: Cannot find module 'X'` from a path inside `node_modules/@expo/metro/...` when Expo starts.

Fix: declare the alias explicitly as a direct dep of `apps/app`, copying the version range from the upstream package.json. Precedent in this repo: `@babel/traverse--for-generate-function-map` (see commit `98f69f7`). If you hit this with another Metro dep, find the upstream package's declaration and add the same alias to `apps/app/package.json`.

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

### Voice & audio (Phase 3+)
- Voice input/output uses device-native STT/TTS (`expo-speech-recognition`, `expo-speech`). Audio never leaves the device — matches the BYOK privacy story.
- OpenRouter has no realtime voice / no TTS / no Whisper endpoint. Some multimodals (Gemini Pro/Flash, Xiaomi MiMo) accept audio input, but the standard flow doesn't need them.
- See [`honest-ai-architecture.md`](honest-ai-architecture.md) §"Voice & Audio" for the full pattern.

### Pricing tiers
- Free Local (no account, BYOK only)
- Cloud BYOK ($5/mo) — account + sync, you bring keys
- Cloud + Credits — $5/mo + 25-30% markup credits via Stripe
- Subscription ($15/mo) — unlimited hosted tokens

### BYOK gating rule
BYOK is allowed only when our revenue isn't tied to token volume:
- ✓ Free Local, Cloud BYOK, Subscription (revenue is $0 or flat)
- ✗ Cloud + Credits / PAYG (revenue = token markup; BYOK here = free cloud-infra rider, structural loss)

So the BYOK settings page must be hidden or gated for PAYG users. In Subscription tier users mix freely.

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
