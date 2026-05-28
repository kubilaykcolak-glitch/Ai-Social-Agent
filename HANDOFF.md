# Handoff — AutoSocialAgent

> Read this first when opening the project in a fresh chat. It says what exists, what works,
> what's deliberately stubbed, and what to do next. For "where does X live", see `PROJECT_MAP.md`.

**Last updated:** 2026-05-28
**Repo:** https://github.com/kubilaykcolak-glitch/Ai-Social-Agent (branch `master`)
**Status:** Phase 1 skeleton + Phase 2 trend radar + monetisation core + video module
(stub + **real providers**) complete and green. Full `tsc --build` passes; 74 Vitest tests
pass across 24 files. **Real video rendering verified live** (h264 1080×1920 mp4 with burned
captions, correct duration) using locally-installed ffmpeg.

**Product direction (confirmed):** automate trend-driven social posts AND generate faceless
short-form **videos** (b-roll + AI voiceover + captions) for TikTok/Reels/Shorts (9:16) and
YouTube (16:9). Video needs external tools (TTS, stock/AI images, ffmpeg) — Anthropic does NOT
generate video/images. Providers are pluggable behind interfaces and fall back to stubs when
keys/tools are absent, so the module runs with or without setup.

**Video providers (real, wired):**
- **TTS:** `ElevenLabsTtsProvider` (`/v1/text-to-speech/{voice}/with-timestamps`) → audio + word
  timings for captions. Needs `ELEVENLABS_API_KEY` (+ `ELEVENLABS_VOICE_ID`).
- **Visuals:** `PexelsVisualProvider` (stock images). Needs `PEXELS_API_KEY`. **AI image gen is
  still a stub** (`VISUAL_SOURCE=ai` falls back to placeholder) — not yet implemented.
- **Renderer:** `FfmpegRenderer` (local ffmpeg; scale/crop per aspect, burned SRT captions,
  `fps=30` so stills hold their full duration). Needs ffmpeg installed.
- Selection: `createVideoGenerator(config)` picks real per available key, else stub.

**Monetisation focus:** the chosen revenue model is **ad revenue + sponsorship** (not affiliate/product).
So most posts funnel to the ad-monetised hero content (cross-promo, UTM-tracked), and when a sponsor
campaign is live + matching, posts carry the sponsor slot (talking point + CTA + #ad disclosure +
tracked link). Link tracking is UTM params on the destination URLs. Every generated post gets a
monetisation CTA appended deterministically (not left to the model).

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
- **Monetisation** (in core): types (`SponsorCampaign`, `CrossPromoTarget`, `MonetizationPlan`,
  `MonetizationDirective`, `Payout`); `buildUtmUrl`; `selectMonetization` + `applyMonetization`;
  `readMonetizationPlan` (reads `workspace/monetization.json` — see `monetization.example.json`).
- `@autosocial/trend-detection` — `StubTrendDetector` + `AnthropicTrendScorer` (viral+relevance scoring).
- `@autosocial/content-generation` — `AnthropicContentGenerator`.
- `@autosocial/review` — `AnthropicContentReviewer` (threshold-based pass/fail).
- `@autosocial/publishing` — `DefaultPublisher` + adapters: instagram, tiktok, twitter, youtube, cms.
- `@autosocial/video` — faceless video pipeline: `planScenes`, interfaces (`TtsProvider`,
  `VisualProvider`, `Renderer`, `VideoGenerator`), `DefaultVideoGenerator`, stub providers,
  **real** providers (`ElevenLabsTtsProvider`, `PexelsVisualProvider`, `FfmpegRenderer`),
  `createVideoGenerator(config)` / `createStubVideoGenerator()`. Outputs `VideoAsset` (9:16 + 16:9).
- `@autosocial/orchestrator` — `runPipeline()` (regenerate-once-on-low-score, **applies monetisation
  before review/publish** when a plan is present) + `cli` (loads the plan from the workspace),
  `score-topics` (Cowork Automation 1 entrypoint), and `make-video` (script → `videos/<id>/`).

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

# Make a video from a script -> workspace/videos/<id>/ (9:16 + 16:9 mp4 + asset.json)
# Real output needs: ffmpeg installed + PEXELS_API_KEY + ELEVENLABS_API_KEY in .env.
# Without keys it falls back to stub providers (placeholder files).
node apps/orchestrator/dist/make-video-cli.js --id=demo --script="..."
```

**ffmpeg note:** installed on this machine via `winget install Gyan.FFmpeg`. It's on PATH for new
shells; the binary is under `%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg_*\ffmpeg-*\bin`.
`FfmpegRenderer` accepts an `ffmpegPath` option if it's not on PATH.
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
   No media upload yet.
3. **Real video works with keys + ffmpeg** (ElevenLabs TTS, Pexels stock, ffmpeg render). Still
   missing: **AI image generation** (`VISUAL_SOURCE=ai` is a stub), and `VideoAsset` is not yet
   attached to `Draft` or uploaded by the publishing adapters.
4. No `.env` autoloading, scheduling/async loop, persistence, or web UI yet.

## Suggested next steps (pick up here)

**Video roadmap:** skeleton ✅ → real providers (ElevenLabs TTS, Pexels stock, ffmpeg) ✅ →
**next:** AI image provider (`VISUAL_SOURCE=ai`), attach `VideoAsset` to `Draft` + publishing
media upload, optional captions polish (styling/positioning). Then **real trend ingestion**
(Google Trends/X/TikTok).

Monetisation roadmap: **(A) monetisation core ✅ done** → **(B) attribution loop** → **(C) revenue-weighted scoring**.
- **B — Attribution loop:** record `offerId/campaignId` + tracked URL per post in the publishing log
  (`appendPublishingLog` exists), and add an ingest step that pulls clicks/conversions/revenue back
  into the workspace. This is Cowork Automation 3's real purpose.
- **C — Revenue-weighted scoring:** add a "monetisation potential" axis to `AnthropicTrendScorer`
  (or a wrapper) so topics matching high-value active sponsors / historically-earning offers rank up.
- **Phase 3:** upgrade `runPipeline` into the async polling loop (6h poll, score, top-3, dispatch,
  staging writes) with retry/rate-limit/structured logging.
- **Phase 4:** wire the first real publishing adapter end-to-end (Twitter/X is simplest).
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
