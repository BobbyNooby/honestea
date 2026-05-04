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

**Phase 1 (current): every request is BYOK, direct-to-provider. No server in the request path.** No paid tiers exist yet, so there is nothing the server is doing that the client can't do itself. The Expo app calls OpenRouter/Anthropic/OpenAI directly with the user's key from `expo-secure-store`.

Future tier behavior (Stage 2+, when `apps/server` becomes load-bearing):
- Free Local: same as today — direct call, no backend.
- Paid tiers: Expo calls `apps/server` `/api/chat`; server uses master key.
- Client branches on `await SecureStore.getItemAsync(...)` — same chat code, different path.

### Voice & audio (Phase 3+)
- Voice input/output uses device-native STT/TTS (`expo-speech-recognition`, `expo-speech`). Audio never leaves the device — matches the BYOK privacy story.
- OpenRouter has no realtime voice / no TTS / no Whisper endpoint. Some multimodals (Gemini Pro/Flash, Xiaomi MiMo) accept audio input, but the standard flow doesn't need them.
- See [`honest-ai-architecture.md`](honest-ai-architecture.md) §"Voice & Audio" for the full pattern.

### OpenRouter tools & plugins
- For OR-side capabilities (web search, web fetch, image generation, etc.) **use the server-tool form**: `tools: [{ type: "openrouter:web_search" }]`. The `:online` slug suffix and `plugins: [{ id: "web" }]` are deprecated — they still work but force one search per turn instead of letting the model decide 0–N.
- Server tools require the model to support tool calling. Gate any tool toggle on `model.supported_parameters.includes("tools")` from the OR registry — without that gate OR errors on unsupported models.
- Tool costs (web search results, image generation outputs, etc.) roll into `usage.cost`. Don't add separate accounting layers — the existing `costUsd` path is the source of truth.
- When using server tools, force the OpenRouter route even if the curated model has an Anthropic `directRoute`. Anthropic-direct doesn't run OR's `openrouter:*` tools; losing prompt caching is preferable to silently dropping the tool. Handled in `apps/app/lib/chat-route.ts` via `pickRoute(modelId, { webSearch })`.
- Citations from web search live in `messages.citations` (schema v6, JSON-encoded `Citation[]`). Empty/null = no search ran. Drives the "🌐 N sources" chip in the chat view.

### Pricing tiers
- **Free Local** (no account, BYOK only)
- **Pay-as-you-go** — $0/mo + 25-30% markup credits via Stripe. Zero monthly fee — markup is the entire revenue stream. **First-time PAYG activation requires a $7.99 minimum deposit** as an anti-fraud floor; the $7.99 lands as marked-up balance the user spends down. Subsequent top-ups can be any amount.
- **Subscription** — flat monthly with three sub-tiers (Pro $15 / Max 5× $60 / Max 10× $100). Unlimited hosted tokens within the tier's quota multiplier; premium models (Opus, GPT-5 Ultra, etc.) still draw from credit balance.
- **Cloud BYOK** ($5/mo) — account + sync, you bring keys. Niche tier for heavy users who want to dodge the PAYG markup.

### Why PAYG is $0/mo
PAYG used to carry a $5/mo flat fee on top of the markup, but that's structurally redundant — Cloud BYOK exists to charge for sync when there's no markup revenue, so PAYG charging both the markup AND a sync fee was double-billing. The $7.99 first-deposit floor still pre-funds enough markup to cover several months of light-user infra. Markup bumps to 28-30% (from 25%) to absorb infra costs the flat fee used to cover.

### Wallet semantics
Credit balance lives on the account, not on the active tier. **Switching tiers never touches the balance** — it's the user's money. PAYG → Subscription preserves leftover balance (sits as fallback for fair-use overage / premium models). Subscription → PAYG: balance is still spendable. Anyone can top up at any time, no minimum on top-ups (the $7.99 floor is only on first-time PAYG activation). Balance doesn't expire; refunds are explicit-only.

### BYOK gating rule
BYOK is allowed only when our revenue isn't tied to token volume:
- ✓ Free Local, Cloud BYOK, Subscription (revenue is $0 or flat)
- ✗ Pay-as-you-go (revenue = token markup; BYOK here = free cloud-infra rider, structural loss)

So the BYOK settings page must be hidden or gated for PAYG users. In Subscription tier users mix freely.

### Privacy & data retention (the commitment)

Two **orthogonal** axes. Don't conflate them.

**Axis 1 — chat history storage (per-conversation toggle).** Each conversation independently lives in one of two places:
- **Local only** — the row exists only in the device's SQLite DB. Lost on uninstall, never reaches our server. Default for everyone.
- **Cloud synced** — the row is mirrored to our server so it's available on the user's other devices. Encrypted client-side before upload (target: AES-256, key derived from the user's account password and never sent to us). We serve the encrypted blobs back; we can't read them. Opt-in per conversation via the storage toggle in the chat header (`components/settings/storage-toggle.tsx`).

**Axis 2 — analytics / usage ledger (per account).** A separate, **always-metadata-only** stream:
- Free Local users have no account → no analytics flow at all.
- Account holders (Cloud BYOK / PAYG / Subscription) — every completed assistant turn writes a `usage_events` row: `model_id | provider | prompt_tokens | completion_tokens | cost_usd | timestamp` + optional `tool_call_count`. **No prompt or response content, ever.** This is what powers the Savings card and (Stage 2) billing.
- For hosted tiers (PAYG / Sub) the request flows through our server, but the server discards request bodies after forwarding + billing — only the metadata row is persisted.
- For Cloud BYOK, requests go device → provider directly; the client posts the metadata row to our server after each turn so analytics still work.

What this means in practice:
| Tier | Account? | Chat history | Analytics |
|---|---|---|---|
| Free Local | No | Local only | — |
| Cloud BYOK ($5/mo) | Yes | Toggle per conversation | Yes (metadata only) |
| PAYG ($0/mo + credits) | Yes | Toggle per conversation | Yes (metadata only) |
| Subscription | Yes | Toggle per conversation | Yes (metadata only) |

Engineering rules that fall out of this:
- `apps/server` MUST NOT log request bodies for hosted-tier traffic. Log `model | tokens-in | tokens-out | cost | tool-call-count` and nothing else.
- The `usage_events` table is the canonical analytics source. Per-user analytics queries hit only this table, never the chat-content table.
- Cloud-synced chat rows are stored as ciphertext blobs server-side. The server schema must not include any column that would require reading the plaintext.
- Aggregate analytics across users (e.g. "average token spend per Pro user") must compute without retaining per-user identifiers in the report.
- We never train on user content. We don't have it to train on, and we won't change that.

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
- **Phase 1: don't route BYOK requests through `apps/server`.** Call OpenRouter directly from the app. The server's `/api/chat` and `/api/models` are Stage 2 scaffolding — they exist but are not in the request path yet.

## Post-release rules (does NOT apply yet — pre-launch)

These rules turn on **after** the first store release ships. While we're pre-launch, schema changes can be made freely — we wipe the dev DB and move on. Once real users have data on their phones, that escape hatch is gone.

### Database migrations
- **Every schema change ships with a forward migration.** Never edit a previous migration in place; always add a new one (`applyMigrationVN` in `apps/app/lib/db/index.ts`, mirrored later for the server's Postgres). Old installs can be on any prior version, so the migration ladder must run cleanly from any starting point.
- **Every migration is idempotent.** Use `IF NOT EXISTS` for tables, `PRAGMA table_info` existence checks for columns. App launch re-runs the full ladder.
- **Never drop or rename a column without a multi-step deprecation.** Add the new column, dual-write for a release or two, then drop the old one in a later migration once telemetry shows nobody is on the old client. A user can install version N, skip versions, and open version N+5 — that path must work.
- **Backfills run inside the migration**, not in random app code. If the new column needs values derived from old rows, populate it in the same migration that adds it.
- **Test the migration on a real prior-version DB** before shipping, not just on a fresh install. The fresh-install path won't catch ALTER-on-populated-table bugs.

### Server-side data (Stage 2+)
- Same rules apply to Postgres in `apps/server` once it's load-bearing. Use a real migration tool (drizzle-kit, atlas, or sqlx-style ladder) — no hand-rolled `CREATE TABLE IF NOT EXISTS` strings.
- Migrations run on deploy, before the new code starts serving traffic. Roll-forward only — write the next migration to undo a mistake, don't roll back.

## Phase 1 scope (current)

BYOK-only chat in Expo Go on a phone. The only goal is "I can talk to Claude in a chat app I built."

- No `apps/web` work, no auth, no Stripe, no Supabase, no billing.
- **`apps/server` scaffolding exists** (`/api/chat` proxy, `/api/models` cache, BYOK key validation) but is **not in the request path right now**. The Expo app calls OpenRouter directly:
  - Model catalog → `GET https://openrouter.ai/api/v1/models` (public, no auth — ~330 models including ~50 free ones)
  - Chat completions → `POST https://openrouter.ai/api/v1/chat/completions` with `Authorization: Bearer <user's sk-or-v1-... from expo-secure-store>`
  - Streaming on native: use `expo/fetch` (not the global `fetch`) — RN's built-in fetch doesn't expose `response.body` as a stream in Expo Go.
- The server becomes load-bearing once paid tiers ship (master key must not be bundled, plus auth/sync/billing). Until then it's Stage 2 scaffolding.

See architecture doc §"Phase 1 Implementation Order" for the week-by-week breakdown.

## Useful links

- Expo docs: https://docs.expo.dev
- Better Auth + Expo: https://www.better-auth.com/docs/integrations/expo
- Elysia docs: https://elysiajs.com
- SvelteKit docs: https://kit.svelte.dev
- Turborepo docs: https://turbo.build/repo/docs
