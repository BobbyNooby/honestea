# HonesTea 🍵

A local-first, bring-your-own-key AI chat harness for Android & iOS.
One OpenRouter key unlocks 400+ models — and the app tells you exactly
what every message costs.

No account. No server. No subscription. Your keys and your chats live
in your pocket and nowhere else.

---

## Why

Most chat apps hide the meter. HonesTea is built around showing it to
you: every reply is stamped with the real tokens and real dollars it
cost, every model's price is live from OpenRouter's catalog, and the
built-in **Auto** mode picks the cheapest model that can actually handle
each message — vision when you attach an image, tool-capable when web
search is on, enough context for the whole conversation.

## Features

- **400+ models via one OpenRouter key** — Fable, GPT-6 Astra, Kimi K3,
  GLM, DeepSeek, and the whole open-weights world
- **Auto routing** — cheapest capable model per message, with graceful
  fallbacks
- **Honest costs** — per-message USD (real `usage`, not estimates),
  per-model lifetime spend, a savings card vs. flagship pricing
- **Stop for real** — abort mid-stream; you keep the partial reply and
  only pay for what streamed
- **Context compaction** — long chats get summarized automatically at
  80% of the model's window instead of silently breaking
- **Web search / fetch / date-time tools** with a live activity panel
  and citation chips
- **Regenerate with version history** — flip between replies; superseded
  versions still count in cost totals (they were real spend)
- **Images & PDFs** in, **voice dictation** and read-aloud out
- **Local-only** — SQLite on device, keys in the iOS Keychain / Android
  Keystore, full-text search across chats, works offline for history

## Getting started

### 1. Get an OpenRouter key

Sign up at [openrouter.ai/keys](https://openrouter.ai/keys) — pay-as-you-go,
no subscription. Most chats cost fractions of a cent.

### 2. Get the app

**Android:** grab the latest APK from
[Releases](https://github.com/BobbyNooby/honestea/releases)
(built automatically by CI on every merge to `main`).

**iOS / development:** install [Expo Go](https://expo.dev/go), then

```bash
pnpm install
pnpm dev:app
```

and scan the QR code with your phone.

### 3. Paste your key, pick a model, talk.

The default is a balanced workhorse model; switch to anything in the
header picker, or choose **Auto** and let the app route for you.

## Building from source

```bash
pnpm install
npx expo prebuild -p android          # generate the native project
cd apps/app/android && ./gradlew assembleRelease
```

Requires Node 22+, pnpm 11, JDK 17–21, and an Android SDK. The release
APK is signed with the debug keystore (fine for testing; not for store
distribution).

## Releases

CI does the building — never build locally to share an APK.

- **Merge (or push) to `main`** → GitHub Actions builds the release APK
  (arm64) and uploads it as a workflow artifact. Find it under
  **Actions → Android preview APK → latest run**. Artifacts require a
  GitHub login to download.
- **Cut a public release** → tag a commit and push the tag:

  ```bash
  git checkout main
  git pull
  git tag v0.1.0
  git push origin v0.1.0
  ```

  CI builds the APK and publishes it as a **prerelease** on the
  [Releases](https://github.com/BobbyNooby/honestea/releases) page —
  publicly downloadable, no login needed. Bump the tag number for each
  release (`v0.1.1`, `v0.2.0`, …).

## Repo layout

```
honestea/
├── apps/app/        Expo (SDK 57) / React Native app — the whole product
├── packages/shared/ Cost math, curated models, Auto routing engine
└── docs/            Landing page (GitHub Pages)
```

## Privacy

Chats are stored in a local SQLite database. API keys are stored in the
system keystore and sent only to OpenRouter over TLS. There is no backend
to leak: this repo contains no server code at all. Delete the app and
everything is gone.

## License

Private project — all rights reserved until a license lands.
