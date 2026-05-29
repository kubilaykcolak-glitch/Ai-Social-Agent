# Handoff — AutoSocialAgent

> Read this first when opening the project in a fresh chat. It says what exists, what works,
> what's deliberately stubbed, and what to do next. For "where does X live", see `PROJECT_MAP.md`.

**Last updated:** 2026-05-29
**Repo:** https://github.com/kubilaykcolak-glitch/Ai-Social-Agent (branch `master`)
**Status:** Phase 1 skeleton + Phase 2 trend radar + monetisation core + video module
(stub + **real providers**) + **story-mode (serialized AI fiction)** + **real YouTube upload**
complete and green. Full `tsc --build` passes; **107 Vitest tests pass**. **Real video
rendering verified live** (h264 1080×1920 mp4 with burned captions) using locally-installed
ffmpeg; story-render + story-publish (stub) verified end-to-end.

**Product direction (confirmed 2026-05-29 — refocused):** the priority is **AI-generated
serialized story videos** (e.g. an apocalypse saga) → auto-post to YouTube/TikTok/Instagram →
earn from **views/ad revenue**. Revenue focus is **sponsor + YouTube ad revenue**; **X is kept
free/organic** (no paid API, build engagement over time, expand later if it makes sense).
The **attribution loop** (click/UTM tracking, Monetisation B) is **designed but shelved** — it
serves the affiliate/sponsor-link model, not view-based ad revenue, so it's off the critical
path for now (spec at `docs/superpowers/specs/2026-05-29-attribution-loop-design.md`).

Story-mode structure: a planned **multi-part arc** (one coherent story, sliced into cliffhanger
parts) inside an ongoing **saga** (a persisted "story bible" carries characters/world/canon/open
threads across arcs). Each part = a long-form **16:9 YouTube hero** + an AI-written short **9:16
teaser** funneling to it. Quality gate: AI **self-critique + revision loop** against a story-craft
rubric, then **human approval** before render/publish.

Video needs external tools (TTS, stock/AI images, ffmpeg) — Anthropic does NOT generate
video/images. Providers are pluggable behind interfaces and fall back to stubs when keys/tools
are absent. Story generation is pure-LLM (rides the Claude subscription, $0 marginal); the only
per-video cost is ElevenLabs voiceover (~$1/part: long episode + teaser).

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
- `@autosocial/story` — serialized AI fiction: `StoryArcGenerator` (whole-arc generation, sliced
  into cliffhanger parts), `StoryCritic` (rubric scoring), `generateArc` (self-critique + revision
  loop, returns best attempt), `updateBible` (saga continuity). Pure logic, mock-client tested.
- `@autosocial/orchestrator` — `runPipeline()` (regenerate-once-on-low-score, **applies monetisation
  before review/publish** when a plan is present) + `cli`, `score-topics` (Cowork Automation 1),
  `make-video` (script → `videos/<id>/`), **`story-arc`** (generate+critique arc → part drafts +
  advance bible), **`story-render`** (approved part → hero 16:9 + teaser 9:16 via the video engine),
  **`story-publish`** (upload hero to YouTube + log row), and **`youtube-auth`** (one-time refresh-token grab).
- **Real YouTube upload** (in publishing): `VideoUploader` interface, `YoutubeVideoUploader` (googleapis
  `videos.insert`, resumable, OAuth2 refresh), `StubVideoUploader`, `createVideoUploader(config)`,
  one-time OAuth2 helpers (`buildConsentUrl`/`exchangeCodeForRefreshToken`). Uploads default to **private**.

## How to run

```bash
npm install
npm run build          # tsc --build across all packages
npm test               # 95 tests, all green
cp .env.example .env   # default LLM_CLIENT=claude-code needs NO key (uses your local Claude login)

# Score topics (Cowork Automation 1): reads $WORKSPACE_DIR/inbox/topics/*.json -> queue/approved-topics.json
node apps/orchestrator/dist/score-topics-cli.js --limit=10

# Full content pipeline
node apps/orchestrator/dist/cli.js --platforms=instagram,tiktok

# Make a video from a script -> workspace/videos/<id>/ (9:16 + 16:9 mp4 + asset.json)
# Real output needs: ffmpeg installed + PEXELS_API_KEY + ELEVENLABS_API_KEY in .env.
# Without keys it falls back to stub providers (placeholder files).
node apps/orchestrator/dist/make-video-cli.js --id=demo --script="..."

# Story-mode: generate a serialized arc -> story/<series>/arcs/<arc>/partNN.json (drafts).
# First arc of a new series needs --premise (seeds the bible); later arcs reuse the bible.
node apps/orchestrator/dist/story-arc-cli.js --series=ashfall --parts=5 --minutes=4 \
  --premise="A solar flare ends the grid; survivors shelter in a buried mall." --genre="post-apocalyptic"

# Review the part drafts, then render an approved part -> videos/<series>/<arc>/partNN/
# (hero 16:9+9:16 from heroScript, teaser 9:16 from teaserScript). Stub w/o keys.
node apps/orchestrator/dist/story-render-cli.js --series=ashfall --arc=<arcId> --part=1

# One-time: get a YouTube refresh token (needs YOUTUBE_CLIENT_ID/SECRET in .env).
# Prints a consent URL; approve, then re-run with --code=<code> from the redirect.
node apps/orchestrator/dist/youtube-auth-cli.js
node apps/orchestrator/dist/youtube-auth-cli.js --code=<code>

# Publish: upload the rendered hero (16:9) to YouTube as PRIVATE (review in Studio).
# Stub upload (logs a row, no real post) when YOUTUBE_* creds are absent.
node apps/orchestrator/dist/story-publish-cli.js --series=ashfall --arc=<arcId> --part=1
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
2. **Platform publishing** — **YouTube video upload is REAL** (`YoutubeVideoUploader`, behind
   `YOUTUBE_*` creds; uploads default to private). The *text* adapters (Instagram Graph, TikTok,
   X v2, CMS REST) still have `// TODO` mock `publish()`. TikTok/Instagram **video** upload not built.
3. **Real video works with keys + ffmpeg** (ElevenLabs TTS, Pexels stock, ffmpeg render). Still
   missing: **AI image generation** (`VISUAL_SOURCE=ai` is a stub). The 9:16 teaser is rendered but
   not yet uploaded anywhere (YouTube upload is the 16:9 hero only).
4. No `.env` autoloading, scheduling/async loop, persistence, or web UI yet.

## Suggested next steps (pick up here)

**CRITICAL PATH (confirmed 2026-05-29):** story videos → auto-post → earn from views. Story-mode
generation ✅ and **real YouTube upload ✅**. End-to-end now runnable: `story-arc` → approve →
`story-render` → `story-publish` (YouTube, private). The remaining work is setup + polish + reach.

1. **Prove a real upload + grow reach.** Set up `YOUTUBE_*` (Google Cloud OAuth client + the
   `youtube-auth` flow) + `ELEVENLABS_API_KEY` + `PEXELS_API_KEY`, run a real arc end-to-end, confirm
   the private upload in YouTube Studio. Then it's a content/reach game (hit Partner Program: 1k subs
   + 4k watch-hours, or Shorts thresholds) — that's where the ad revenue starts.
2. **Story-mode polish:** AI image visuals (`VISUAL_SOURCE=ai` is still a stub — matters a lot for
   apocalypse visuals where Pexels stock is thin); caption styling; optional bible-edit/approval of
   canon (today the bible advances on generation, not on human approval).
3. **`.env` autoloading** (dotenv) so all keys load without manual export.
4. **TikTok/Reels for the 9:16 teasers** (the funnel) — once a TikTok developer app passes audit.

**Deferred (designed, not on critical path):**
- **Attribution loop (Monetisation B)** — spec at `docs/superpowers/specs/2026-05-29-attribution-loop-design.md`.
  Serves sponsor/affiliate-link tracking, not view-based ad revenue. Revisit once sponsorships matter.
- **C — Revenue-weighted scoring**, **Phase 3 async polling loop**, **AI image gen**, **real trend ingestion**.
- **X/Twitter:** kept free/organic; no paid Basic API. Expand later if engagement justifies it.
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
