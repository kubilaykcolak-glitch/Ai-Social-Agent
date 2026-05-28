# Handoff — AutoSocialAgent

> Read this first when opening the project in a fresh chat. It says what exists, what works,
> what's deliberately stubbed, and what to do next. For "where does X live", see `PROJECT_MAP.md`.

**Last updated:** 2026-05-28
**Repo:** https://github.com/kubilaykcolak-glitch/Ai-Social-Agent (branch `master`)
**Status:** Phase 1 skeleton + Phase 2 trend radar (FS contract, topic scoring, local-Claude client)
complete and green. Full `tsc --build` passes; 42 Vitest tests pass across 15 files.

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
- **LLM client:** abstracted behind the `AnthropicClient` interface. Default is `ClaudeCodeClient`
  (runs on the local Claude **subscription** via the Agent SDK — **no API key**). `SdkAnthropicClient`
  (metered API key) is the fallback. Select with `LLM_CLIENT=claude-code|api`; build via `createLlmClient(config)`.
- **Anthropic SDK:** upgraded to `@anthropic-ai/sdk` ^0.100 (prompt caching is GA, so the client uses
  the plain `messages.create` with `cache_control`). `@anthropic-ai/claude-agent-sdk` ^0.3 powers the local client.
- **Filesystem contract:** all trend-radar folders live under one root (`WORKSPACE_DIR`, default `./workspace`,
  git-ignored). Resolved by `resolveWorkspace()`; read/write via `fs-store` helpers. This is the seam Cowork watches.

## What's built (all done)

- `@autosocial/core` — types, interfaces, errors, logger, config, `SdkAnthropicClient`,
  `ClaudeCodeClient`, `createLlmClient`, workspace layout (`resolveWorkspace`) + `fs-store` helpers,
  FS-contract types (`RawTopic`, `ScoredTopic`, `ApprovedTopicsFile`, `Draft`, `PublishingLogRow`).
- `@autosocial/trend-detection` — `StubTrendDetector` + `AnthropicTrendScorer` (viral+relevance scoring).
- `@autosocial/content-generation` — `AnthropicContentGenerator`.
- `@autosocial/review` — `AnthropicContentReviewer` (threshold-based pass/fail).
- `@autosocial/publishing` — `DefaultPublisher` + adapters: instagram, tiktok, twitter, youtube, cms.
- `@autosocial/orchestrator` — `runPipeline()` (regenerate-once-on-low-score) + `cli`,
  plus `score-topics` (Cowork Automation 1 entrypoint: inbox → score → approved-topics queue).

## How to run

```bash
npm install
npm run build          # tsc --build across all packages
npm test               # 42 tests, all green
cp .env.example .env   # default LLM_CLIENT=claude-code needs NO key (uses your local Claude login)

# Score topics (Cowork Automation 1): reads $WORKSPACE_DIR/inbox/topics/*.json -> queue/approved-topics.json
node apps/orchestrator/dist/score-topics-cli.js --limit=10

# Full content pipeline
node apps/orchestrator/dist/cli.js --platforms=instagram,tiktok
```
With `LLM_CLIENT=api` and no `ANTHROPIC_API_KEY`, the LLM factory throws a clear error (expected).

## Cowork automations (configured in Cowork, NOT repo code)

The repo provides the callable agent-side pieces; Cowork wires the folder triggers around them.
- **Automation 1 (daily trend pull):** watch `inbox/topics/` → run `score-topics-cli` → writes `queue/approved-topics.json`. **Built (the CLI).**
- **Automation 2 (review staging):** watch `drafts/` → run the quality gate → `moveDraft()` to `ready-to-publish/` or `needs-revision/`. *(quality-gate CLI not built yet)*
- **Automation 3 (publishing log):** after publish → `appendPublishingLog()` to `logs/publishing-log.csv`. *(helper built; not yet called by a publish flow)*

## What is deliberately STUBBED (the real work remaining)

1. **Trend sources** — `StubTrendDetector` returns seeded data. Scoring (`AnthropicTrendScorer`) is real,
   but real *ingestion* (Google Trends, X API, RSS) into `inbox/topics/` is not wired.
2. **Platform publishing** — every adapter's `publish()` has a `// TODO` for the real API call
   (Instagram Graph, TikTok Content Posting, X API v2, YouTube Data API, CMS REST). Mock results for now.
3. No `.env` autoloading, scheduling/async loop, persistence, web UI, or media generation yet.

## Suggested next steps (pick up here)

- **Phase 3:** upgrade `runPipeline` into the async polling loop (6h poll, score, top-3, dispatch,
  staging writes) with retry/rate-limit/structured logging.
- **Phase 4:** wire the first real publishing adapter end-to-end (Twitter/X is simplest).
- Build the quality-gate CLI for Cowork Automation 2 (reads a draft, runs the reviewer, moves it).
- Add `.env` autoloading (e.g. `dotenv`) — `loadConfig` reads `process.env` but nothing loads `.env`.

## Conventions to keep

- New cross-cutting shapes go in `packages/core/src/types.ts`.
- Each package depends only on `@autosocial/core` interfaces, never on another package's internals.
- TDD: write the failing test first (existing tests show the pattern). In-package tests import
  local source via `.js` specifiers; cross-package via `@autosocial/<name>`.
- After adding a new package.json, run `npm install` so the workspace symlink is created.

## Notes / gotchas

- The `docs/superpowers/` spec + plan are kept locally but git-ignored (not pushed to the public repo).
- Per-package build: `npx tsc --build packages/<name>`. Full build: `npm run build`.
