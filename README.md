# HonesTea — Honest AI

A transparent, native mobile AI chat platform. See what AI actually costs. Switch between Claude, GPT, Gemini, and more. Bring your own keys or let us handle the infra — your choice, your data.

---

## What this is

Most AI apps charge $20/month and hope you don't use it. HonesTea shows you the real per-message cost, routes your prompts to the cheapest capable model, and lets you choose between BYOK (free), pay-as-you-go, or subscription — all from one native app.

**Key differentiators:**
- **True native mobile** (Expo / React Native) — not a PWA wrapped in an app shell
- **Multi-model** — Claude, GPT, Gemini, Kimi, DeepSeek, and 300+ more via OpenRouter
- **Transparent pricing** — every message shows what it cost, in dollars
- **BYOK-first** — your API keys, direct-to-provider, never proxied in Phase 1
- **Smart routing** — automatically pick the cheapest model that can handle the task
- **Privacy by default** — chats stay on your device unless you opt into encrypted cloud sync

---

## Repo structure

pnpm + Turborepo monorepo:

```
honestea/
├── apps/
│   ├── app/        Expo / React Native mobile app (BYOK chat, model picker, settings)
│   ├── server/     Elysia.js API (auth, chat proxy, billing) — Stage 2 scaffolding
│   └── web/        SvelteKit landing + account dashboard + admin
├── packages/
│   └── shared/     Types, model registry, cost calc, curated model list
├── honest-ai-business-plan.md
├── honest-ai-architecture.md
├── honest-ai-scaling.md
└── roadmap.md
```

Internal packages use `workspace:*`. All packages extend `tsconfig.base.json`.

---

## Tech stack

| Layer | Tech |
|---|---|
| Mobile app | Expo SDK 55, React Native 0.83, NativeWind v4 |
| Backend API | Elysia.js 1.4 (Bun runtime) |
| Web frontend | SvelteKit on Vercel |
| Shared code | TypeScript, `workspace:*` |
| Database (app) | SQLite via `expo-sqlite` + Drizzle ORM |
| Database (server) | Postgres (Supabase) — Stage 2 |
| Auth | Better Auth — Stage 2 |
| Payments | Stripe — Stage 2 |
| AI streaming | Vercel AI SDK 5, `@openrouter/ai-sdk-provider` |
| Dev runner | mprocs (not Turbo — preserves Expo QR code output) |

---

## Prerequisites

- **Node.js** >= 22
- **pnpm** 10.23.0 (enforced via `packageManager` field)
- **Bun** (for `apps/server`)
- An **Expo account** (free) if you want to build APKs via EAS

---

## Getting started

```bash
# 1. Install everything
pnpm install

# 2. Start all three apps in mprocs panes
pnpm dev

# Or run individually:
pnpm dev:app      # Expo (QR code for Expo Go)
pnpm dev:server   # Elysia API
pnpm dev:web      # SvelteKit
```

### First-time app setup
1. Open the Expo Go app on your phone
2. Scan the QR code from `pnpm dev:app`
3. Go to **Settings → API Access** and paste your **OpenRouter API key** (`sk-or-v1-...`)
4. Start chatting

---

## Building a standalone APK

You don't need Android Studio. EAS Build compiles in the cloud:

```bash
# One-time setup
pnpm eas:login
pnpm eas:configure

# Build APK for your phone
pnpm eas:build:android
```

In ~5–15 minutes you'll get a download link. Sideload the `.apk` and go.

Other EAS scripts:

| Script | Purpose |
|---|---|
| `pnpm eas:build:android:prod` | Production Android build |
| `pnpm eas:build:ios` | iOS preview build |
| `pnpm eas:build:ios:prod` | Production iOS build |
| `pnpm eas:build:list` | View past builds |

---

## Key project docs

- [`honest-ai-business-plan.md`](honest-ai-business-plan.md) — product, pricing tiers, marketing, unit economics
- [`honest-ai-architecture.md`](honest-ai-architecture.md) — stack, security, auth, API key management, phase-by-phase implementation
- [`honest-ai-scaling.md`](honest-ai-scaling.md) — migration playbook, cost optimization, infrastructure triggers
- [`roadmap.md`](roadmap.md) — living checklist of what's shipped, in flight, and queued
- [`CLAUDE.md`](CLAUDE.md) — coding conventions, sharp edges, git rules, what NOT to do

---

## Current status (Phase 1)

This is an **alpha / pre-launch** build. The app is BYOK-only right now:
- No accounts, no auth, no billing
- The Expo app calls OpenRouter directly with your stored key
- `apps/server` exists as Stage 2 scaffolding but is not in the request path
- All chat history is local SQLite; nothing reaches our servers

See `roadmap.md` for the full epic breakdown.

---

## Contributing

This is a personal project. No external contributions expected right now, but the code is here if it's useful.

## License

MIT
