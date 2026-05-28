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
| `@autosocial/orchestrator` | `apps/orchestrator` | Pipeline + CLI entrypoint |

## File index

### packages/core/src
- `types.ts` — `PlatformName`, `Trend`, `ContentBrief`, `PlatformContent`, `GeneratedContent`, `ReviewResult`, `ValidationResult`, `PublishResult`
- `interfaces.ts` — `TrendDetector`, `ContentGenerator`, `ContentReviewer`, `PlatformAdapter`, `Publisher`
- `errors.ts` — `GenerationError`, `ReviewError`, `PublishError`
- `logger.ts` — `Logger` interface, `consoleLogger`
- `config.ts` — `AppConfig`, `loadConfig(env)` (reads `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `REVIEW_SCORE_THRESHOLD`)
- `anthropic-client.ts` — `AnthropicClient` interface, `SdkAnthropicClient` (uses SDK `beta.promptCaching.messages.create` for `cache_control`)
- `index.ts` — barrel re-export of all of the above

### packages/trend-detection/src
- `stub-detector.ts` — `StubTrendDetector` (seeded trends, sorted by score desc) → replace with real source
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

### apps/orchestrator/src
- `pipeline.ts` — `runPipeline(cfg)`, types `PipelineConfig` / `PipelineOutput`; sequences detect→generate→review→publish with regenerate-once-on-low-score
- `cli.ts` — CLI entrypoint; `parsePlatforms(argv)`, builds real deps, runs pipeline, prints results

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
