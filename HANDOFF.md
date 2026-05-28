# Handoff — AutoSocialAgent

> Read this first when opening the project in a fresh chat. It says what exists, what works,
> what's deliberately stubbed, and what to do next. For "where does X live", see `PROJECT_MAP.md`.

**Last updated:** 2026-05-28
**Repo:** https://github.com/kubilaykcolak-glitch/Ai-Social-Agent (branch `master`)
**Status:** Skeleton complete and green. Full `tsc --build` passes; 25 Vitest tests pass across 10 files.

## What this is

A TypeScript npm-workspaces monorepo for a content-creation agent:
detect trends → generate platform content with the Anthropic API → AI self-critique review →
publish via per-platform adapters. Wired together by a pipeline orchestrator with a CLI.

## Key decisions already made (don't relitigate without reason)

- **Monorepo:** npm workspaces + `tsc` project references, ESM (`"type": "module"`).
- **Integration depth:** architecture + stubs. No API keys needed to run the pipeline against stubs.
- **Review module:** AI self-critique only (a 2nd Anthropic call). Deterministic length/format
  checks live in each adapter's `validate()`, NOT in the review module.
- **Orchestration:** sequential pipeline + CLI; modules are independent library packages.
- **Testing:** Vitest, mock `AnthropicClient` injected (no live API in tests).
- **Anthropic SDK:** v0.27.x — prompt caching uses `client.beta.promptCaching.messages.create`
  (the stable `messages.create` types don't accept `cache_control` in this version).

## What's built (all done)

- `@autosocial/core` — types, interfaces, errors, logger, config, `SdkAnthropicClient`.
- `@autosocial/trend-detection` — `StubTrendDetector`.
- `@autosocial/content-generation` — `AnthropicContentGenerator`.
- `@autosocial/review` — `AnthropicContentReviewer` (threshold-based pass/fail).
- `@autosocial/publishing` — `DefaultPublisher` + adapters: instagram, tiktok, twitter, youtube, cms.
- `@autosocial/orchestrator` — `runPipeline()` (with regenerate-once-on-low-score) + CLI.

## How to run

```bash
npm install
npm run build          # tsc --build across all packages
npm test               # 25 tests, all green
# Real run (needs a key):
cp .env.example .env   # set ANTHROPIC_API_KEY
node apps/orchestrator/dist/cli.js --platforms=instagram,tiktok
```
Without a key the CLI prints "ANTHROPIC_API_KEY not set" and exits 1 (expected).

## What is deliberately STUBBED (the real work remaining)

1. **Trend sources** — `StubTrendDetector` returns seeded data. Wire a real source
   (Google Trends, X API, etc.) as a new `TrendDetector` and inject it in `cli.ts`.
2. **Platform publishing** — every adapter's `publish()` has a `// TODO` where the real
   API call goes (Instagram Graph, TikTok Content Posting, X API v2, YouTube Data API, CMS REST).
   They currently return mock `PublishResult`s.
3. No persistence, scheduling, queue, web UI, or media (image/video) generation — all out of scope so far.

## Suggested next steps (pick up here)

- Wire the first real publishing adapter end-to-end (Twitter/X is usually the simplest).
- Add a real trend detector behind the existing interface.
- Add `.env` loading at startup (e.g. `dotenv`) — `loadConfig` reads `process.env` but nothing
  currently loads the `.env` file automatically.
- Consider persisting pipeline runs / generated content.

## Conventions to keep

- New cross-cutting shapes go in `packages/core/src/types.ts`.
- Each package depends only on `@autosocial/core` interfaces, never on another package's internals.
- TDD: write the failing test first (existing tests show the pattern). In-package tests import
  local source via `.js` specifiers; cross-package via `@autosocial/<name>`.
- After adding a new package.json, run `npm install` so the workspace symlink is created.

## Notes / gotchas

- The `docs/superpowers/` spec + plan are kept locally but git-ignored (not pushed to the public repo).
- Per-package build: `npx tsc --build packages/<name>`. Full build: `npm run build`.
