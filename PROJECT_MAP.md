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
| `@autosocial/orchestrator` | `apps/orchestrator` | Pipeline + CLIs (content, score-topics, make-video) |

## File index

### packages/core/src
- `types.ts` — `PlatformName`, `Trend`, `ContentBrief`, `PlatformContent`, `GeneratedContent`, `ReviewResult`, `ValidationResult`, `PublishResult`; FS-contract types: `RawTopic`, `ScoredTopic`, `ApprovedTopicsFile`, `Draft`, `PublishingLogRow`
- `interfaces.ts` — `TrendDetector`, `TrendScorer`, `ContentGenerator`, `ContentReviewer`, `PlatformAdapter`, `Publisher`
- `errors.ts` — `GenerationError`, `ReviewError`, `PublishError`
- `logger.ts` — `Logger` interface, `consoleLogger`
- `config.ts` — `AppConfig`, `LlmClientKind`, `loadConfig(env)` (`LLM_CLIENT`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `REVIEW_SCORE_THRESHOLD`, `TOPIC_SCORE_THRESHOLD`, `WORKSPACE_DIR`)
- `anthropic-client.ts` — `AnthropicClient` interface, `SdkAnthropicClient` (metered API key; GA `messages.create` + `cache_control`)
- `claude-code-client.ts` — `ClaudeCodeClient` (local Claude subscription via Agent SDK `query()`, no API key)
- `llm.ts` — `createLlmClient(config)` factory (default `claude-code`, fallback `api`)
- `workspace.ts` — `WorkspaceLayout`, `resolveWorkspace(root)` (inbox/queue/drafts/staging/log/monetization paths)
- `fs-store.ts` — `readInboxTopics`, `writeApprovedTopics`, `writeDraft`, `moveDraft`, `appendPublishingLog`, `readMonetizationPlan`
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
- `index.ts` — re-export publisher + all adapters

### packages/video/src
- `types.ts` — `Scene`, `WordTiming`, `TtsResult`, `VisualResult`, `TimedScene`, `RenderSpec`, `VideoAsset`, `AspectRatio`, `VisualKind`; interfaces `TtsProvider`, `VisualProvider`, `Renderer`, `VideoGenerator`
- `scenes.ts` — `planScenes(script)` deterministic script→scenes splitter (+ visualQuery keywords)
- `stub-providers.ts` — `StubTtsProvider`, `StubVisualProvider(kind)`, `StubRenderer`, `tokenize()` (no keys/ffmpeg; placeholder files)
- `elevenlabs-tts.ts` — `ElevenLabsTtsProvider` (real TTS w/ timestamps, injectable http), `charsToWords()`
- `pexels-visual.ts` — `PexelsVisualProvider` (real stock images, injectable http+download)
- `ffmpeg-renderer.ts` — `FfmpegRenderer` (real render, injectable runner) + pure `buildSrt`, `buildConcatList`, `buildFfmpegArgs`, `dimsFor`
- `generator.ts` — `DefaultVideoGenerator` (planScenes→tts→visuals→time scenes→render 9:16+16:9→`VideoAsset`)
- `factory.ts` — `createVideoGenerator(config)` (real-vs-stub per keys/renderer), `createStubVideoGenerator(visualKind)`
- `index.ts` — re-export

### apps/orchestrator/src
- `pipeline.ts` — `runPipeline(cfg)`, types `PipelineConfig` / `PipelineOutput`; sequences detect→generate→(monetise)→review→publish with regenerate-once-on-low-score. `cfg.monetization?` applies CTAs before review/publish
- `cli.ts` — content-pipeline CLI entrypoint; `parsePlatforms(argv)`, builds real deps, runs pipeline, prints results
- `score-topics.ts` — `runTopicScoring(deps)`: inbox → scorer → `writeApprovedTopics`; types `TopicScoringDeps`/`TopicScoringSummary`
- `score-topics-cli.ts` — CLI for Cowork Automation 1 (`autosocial-score-topics`); wires config/llm/workspace/scorer
- `make-video.ts` — `runVideoGeneration(deps)`: script → `videos/<scriptId>/` + asset.json
- `make-video-cli.ts` — CLI (`autosocial-make-video`); builds stub generator from `config.visualSource`

## Where to make common changes

- **Add a real trend source** → new class implementing `TrendDetector` in `packages/trend-detection/src`, inject in `cli.ts`.
- **Add/modify a platform** → new/edit adapter in `packages/publishing/src/adapters`, register in `DefaultPublisher` constructor + `index.ts`.
- **Wire a real platform API** → replace the `// TODO` stub in that adapter's `publish()`.
- **Change a shared shape** → `packages/core/src/types.ts` (propagates everywhere).
- **Tune prompts** → `SYSTEM` const in `generator.ts` / `reviewer.ts`.
- **Change model / caching** → `anthropic-client.ts`; model id default in `config.ts`.

## Stubs / TODO call sites (real integrations not yet wired)
- `packages/trend-detection/src/stub-detector.ts` — seeded data, no live source
- `packages/publishing/src/adapters/*.ts` — each `publish()` has a `// TODO` for the real API call
