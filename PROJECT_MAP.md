# Project Map — AutoSocialAgent

A grep-friendly index of every source file, its responsibility, and the key symbols it exports.
Search this file first to locate where something lives.

## Architecture in one line

`Trend[] → ContentBrief → GeneratedContent → ReviewResult → PublishResult[]`
Independent library packages depend only on interfaces in `@autosocial/core`. The
`orchestrator` app wires them into a pipeline + CLI. Externals are stubbed; Anthropic calls are real.

## Workspaces

| Package | Dir | Purpose |
|---|---|---|
| `@autosocial/core` | `packages/core` | Shared types, interfaces, errors, logger, config, Anthropic client |
| `@autosocial/trend-detection` | `packages/trend-detection` | Detect trends (stub impl) |
| `@autosocial/content-generation` | `packages/content-generation` | Generate platform content via Anthropic |
| `@autosocial/review` | `packages/review` | AI self-critique review/scoring |
| `@autosocial/publishing` | `packages/publishing` | Publisher + 6 platform adapters |
| `@autosocial/video` | `packages/video` | Faceless video pipeline (stub-first) |
| `@autosocial/story` | `packages/story` | Serialized AI story-mode (arc generation + self-critique loop + saga bible) |
| `@autosocial/orchestrator` | `apps/orchestrator` | Pipeline + CLIs (content, score-topics, make-video, story-arc, story-render) |

## File index

### packages/core/src
- `types.ts` — `PlatformName`, `Trend`, `ContentBrief`, `PlatformContent`, `GeneratedContent`, `ReviewResult`, `ValidationResult`, `PublishResult`; FS-contract types: `RawTopic`, `ScoredTopic`, `ApprovedTopicsFile`, `Draft`, `PublishingLogRow`; story types: `StoryCharacter`, `StoryBible`, `StoryPart`, `StoryPartMeta`, `BibleUpdate`, `StoryArc`, `StoryArcRequest`, `StoryCritique`
- `interfaces.ts` — `TrendDetector`, `TrendScorer`, `ContentGenerator`, `ContentReviewer`, `PlatformAdapter`, `Publisher`, `VideoUploader` (uploads a rendered video file; `VideoUploadMetadata` in types.ts)
- `errors.ts` — `GenerationError`, `ReviewError`, `PublishError`
- `logger.ts` — `Logger` interface, `consoleLogger`
- `config.ts` — `AppConfig`, `LlmClientKind`, `VideoVisibility`, `loadConfig(env)` (`LLM_CLIENT`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `REVIEW_SCORE_THRESHOLD`, `TOPIC_SCORE_THRESHOLD`, `STORY_SCORE_THRESHOLD`, `STORY_MAX_REVISIONS`, `WORKSPACE_DIR`, `YOUTUBE_CLIENT_ID/SECRET/REFRESH_TOKEN`, `YOUTUBE_DEFAULT_VISIBILITY`)
- `anthropic-client.ts` — `AnthropicClient` interface, `SdkAnthropicClient` (metered API key; GA `messages.create` + `cache_control`)
- `claude-code-client.ts` — `ClaudeCodeClient` (local Claude subscription via Agent SDK `query()`, no API key)
- `llm.ts` — `createLlmClient(config)` factory (default `claude-code`, fallback `api`)
- `workspace.ts` — `WorkspaceLayout`, `resolveWorkspace(root)` (inbox/queue/drafts/staging/log/monetization/videos/**story** paths)
- `fs-store.ts` — `readInboxTopics`, `writeApprovedTopics`, `writeDraft`, `moveDraft`, `appendPublishingLog`, `readMonetizationPlan`, `readStoryBible`, `writeStoryBible`, `writeStoryPartDraft`
- `utm.ts` — `buildUtmUrl(base, {source,medium,campaign,content})` (preserves existing query)
- `monetization.ts` — `selectMonetization(plan, opts)` (active sponsor else cross-promo; YouTube excluded from self cross-promo), `applyMonetization(content, plan, {now,postId})` (appends CTA+tracked link+disclosure per platform). Types: `SponsorCampaign`, `CrossPromoTarget`, `MonetizationPlan`, `MonetizationDirective`, `Payout`
- `index.ts` — barrel re-export of all of the above

### packages/trend-detection/src
- `stub-detector.ts` — `StubTrendDetector` (seeded trends, sorted by score desc) → replace with real source
- `scorer.ts` — `AnthropicTrendScorer` implements `TrendScorer`; viral+relevance scoring prompt, ranks `RawTopic[]`→`ScoredTopic[]`, approves vs threshold
- `index.ts` — re-export

### packages/content-generation/src
- `generator.ts` — `AnthropicContentGenerator` implements `ContentGenerator`; prompts model for JSON, parses to `GeneratedContent`; throws `GenerationError` on bad output
- `index.ts` — re-export

### packages/review/src
- `reviewer.ts` — `AnthropicContentReviewer` implements `ContentReviewer`; scores content 0–100, `passed = score >= threshold`; throws `ReviewError` on bad output
- `index.ts` — re-export

### packages/publishing/src
- `publisher.ts` — `DefaultPublisher` implements `Publisher`; maps `PlatformName → PlatformAdapter`, isolates per-platform failures, reports missing adapters as failed
- `adapters/instagram.ts` — `InstagramAdapter` (body ≤2200, ≤30 hashtags)
- `adapters/tiktok.ts` — `TiktokAdapter` (body ≤2200, ≤10 hashtags)
- `adapters/twitter.ts` — `TwitterAdapter` (rendered body+hashtags ≤280)
- `adapters/youtube.ts` — `YoutubeAdapter` (script body ≥50 chars)
- `adapters/cms.ts` — `CmsAdapter` (non-empty body; ctor takes REST `endpoint`)
- `stub-uploader.ts` — `StubVideoUploader` implements `VideoUploader`; no-network mock upload (used when YouTube creds absent)
- `youtube-uploader.ts` — `YoutubeVideoUploader` implements `VideoUploader`; maps metadata→insert, builds watch URL, file-exists guard, error→failed result. Injectable `YoutubeInsertFn` (real one uses googleapis)
- `youtube-auth.ts` — one-time OAuth2 helpers: `buildConsentUrl`, `exchangeCodeForRefreshToken` (injectable http), `YOUTUBE_UPLOAD_SCOPE`
- `video-uploader-factory.ts` — `createVideoUploader(config)`: real `YoutubeVideoUploader` (googleapis `videos.insert`, resumable, OAuth2 refresh) when `YOUTUBE_*` present, else stub
- `index.ts` — re-export publisher + all adapters + uploaders/auth/factory

### packages/video/src
- `types.ts` — `Scene`, `WordTiming`, `TtsResult`, `VisualResult`, `TimedScene`, `RenderSpec`, `VideoAsset`, `AspectRatio`, `VisualKind`; interfaces `TtsProvider`, `VisualProvider`, `Renderer`, `VideoGenerator`
- `scenes.ts` — `planScenes(script)` deterministic script→scenes splitter (+ visualQuery keywords)
- `stub-providers.ts` — `StubTtsProvider` (emits a valid **silent WAV** via `buildSilentWav` so the real ffmpeg renderer can consume it — enables free watchable previews), `StubVisualProvider(kind)`, `StubRenderer`, `tokenize()`
- `elevenlabs-tts.ts` — `ElevenLabsTtsProvider` (real TTS w/ timestamps, injectable http), `charsToWords()`
- `pexels-visual.ts` — `PexelsVisualProvider` (real stock images, injectable http+download)
- `ffmpeg-renderer.ts` — `FfmpegRenderer` (real render, injectable runner) + pure `buildSrt`, `buildConcatList`, `buildFfmpegArgs`, `dimsFor`
- `generator.ts` — `DefaultVideoGenerator` (planScenes→tts→visuals→time scenes→render 9:16+16:9→`VideoAsset`)
- `factory.ts` — `createVideoGenerator(config)` (real-vs-stub per keys/renderer), `createStubVideoGenerator(visualKind)`
- `index.ts` — re-export

### packages/story/src
- `arc-generator.ts` — `StoryArcGenerator` (AnthropicClient): generates a COMPLETE coherent arc as one whole, sliced into cliffhanger parts; parses/validates JSON, attaches arcId/seriesId + zero-based part indexes; throws `StoryError`. Feeds `revisionNotes` into the prompt
- `critic.ts` — `StoryCritic` (AnthropicClient): scores an arc 0–100 against a story-craft rubric (hook/tension/cliffhanger/bible-consistency/anti-slop), `passed = score >= threshold`
- `generate.ts` — `generateArc(deps)` revision loop: generate→critique→revise (feeding issues back) until passed or `maxRevisions` exhausted; returns best-scoring attempt. Types `GenerateArcDeps`/`GenerateArcResult`
- `bible.ts` — `updateBible(bible, arc)` pure: append new canon/characters (dedup by name)/threads, remove resolved threads, bump `arcsCompleted` (saga continuity)
- `index.ts` — re-export

### apps/orchestrator/src
- `pipeline.ts` — `runPipeline(cfg)`, types `PipelineConfig` / `PipelineOutput`; sequences detect→generate→(monetise)→review→publish with regenerate-once-on-low-score. `cfg.monetization?` applies CTAs before review/publish
- `cli.ts` — content-pipeline CLI entrypoint; `parsePlatforms(argv)`, builds real deps, runs pipeline, prints results
- `score-topics.ts` — `runTopicScoring(deps)`: inbox → scorer → `writeApprovedTopics`; types `TopicScoringDeps`/`TopicScoringSummary`
- `score-topics-cli.ts` — CLI for Cowork Automation 1 (`autosocial-score-topics`); wires config/llm/workspace/scorer
- `make-video.ts` — `runVideoGeneration(deps)`: script → `videos/<scriptId>/` + asset.json
- `make-video-cli.ts` — CLI (`autosocial-make-video`); builds stub generator from `config.visualSource`
- `story-arc.ts` — `runStoryArc(deps)`: load/seed bible → `generateArc` (critique+revise) → write part drafts to `story/<seriesId>/arcs/<arcId>/partNN.json` → advance+persist bible. Types `StoryArcDeps`/`StoryArcSummary`
- `story-arc-cli.ts` — CLI (`autosocial-story-arc`); flags `--series --arc --parts --minutes --premise --genre`. Bible advances on generation; the approval gate is about render/publish, not canon
- `story-render.ts` — `runStoryRender(deps)`: read an approved part → render hero (16:9 YouTube + 9:16) from `heroScript` and teaser (9:16) from `teaserScript` via the video engine → `videos/<seriesId>/<arcId>/partNN/`. Types `StoryRenderDeps`/`StoryRenderResult`
- `story-render-cli.ts` — CLI (`autosocial-story-render`); `--part-file=` or `--series --arc --part`
- `story-publish.ts` — `runStoryPublish(deps)`: read approved part → upload hero (16:9) via `VideoUploader` (metadata from `platformMeta`, hashtags→bare tags) → append publishing-log row. Types `StoryPublishDeps`
- `story-publish-cli.ts` — CLI (`autosocial-story-publish`); locates part + hero `asset.json`, builds uploader via `createVideoUploader`, `--visibility` override (default `config.youtubeDefaultVisibility`)
- `youtube-auth-cli.ts` — CLI (`autosocial-youtube-auth`); prints consent URL, then `--code=<x>` → prints `YOUTUBE_REFRESH_TOKEN`

## Where to make common changes

- **Add a real trend source** → new class implementing `TrendDetector` in `packages/trend-detection/src`, inject in `cli.ts`.
- **Add/modify a platform** → new/edit adapter in `packages/publishing/src/adapters`, register in `DefaultPublisher` constructor + `index.ts`.
- **Wire a real platform API (text post)** → replace the `// TODO` stub in that adapter's `publish()`.
- **Add a real video-upload platform** → new class implementing `VideoUploader` in `packages/publishing/src`, register in `createVideoUploader`. (YouTube done; TikTok/Instagram pending.)
- **Change a shared shape** → `packages/core/src/types.ts` (propagates everywhere).
- **Tune prompts** → `SYSTEM` const in `generator.ts` / `reviewer.ts`; story-craft prompts in `packages/story/src/arc-generator.ts` / `critic.ts`.
- **Tune story quality bar** → `STORY_SCORE_THRESHOLD` / `STORY_MAX_REVISIONS` in `config.ts`; rubric in `critic.ts`.
- **Change model / caching** → `anthropic-client.ts`; model id default in `config.ts`.

## Stubs / TODO call sites (real integrations not yet wired)
- `packages/trend-detection/src/stub-detector.ts` — seeded data, no live source
- `packages/publishing/src/adapters/*.ts` — each text `publish()` has a `// TODO` for the real API call
- **YouTube video upload is REAL** (`YoutubeVideoUploader` + `createVideoUploader`, behind `YOUTUBE_*` creds). TikTok/Instagram video upload not yet implemented (deferred)
