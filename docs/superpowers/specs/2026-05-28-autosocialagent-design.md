# AutoSocialAgent — Content Creation Agent Monorepo

**Date:** 2026-05-28
**Status:** Approved design

## Purpose

A TypeScript monorepo for an autonomous content-creation agent. It detects
trends, generates platform-tailored content with the Anthropic API, reviews that
content via AI self-critique, and publishes through per-platform adapters
(Instagram, TikTok, Twitter/X, YouTube scripts, and a headless CMS).

This first build delivers the full architecture with real interfaces and a
runnable orchestration pipeline. External integrations (trend sources and the
six publishing targets) are **stubbed behind interfaces**; the Anthropic calls
for generation and review are real but mocked in tests. Real credentials and API
calls drop in later without changing consumer code.

## Decisions

- **Integration depth:** Architecture + stubs. No API keys required to run the
  pipeline end-to-end against stubs.
- **Monorepo tooling:** npm workspaces + `tsc` project references. ESM modules.
- **Orchestration:** A pipeline orchestrator app exposing a CLI. The four
  modules are independent library packages.
- **Review module:** AI self-critique only (a second Anthropic call). Deterministic
  length/format checks live in each adapter's `validate()`, not in review.
- **Testing:** Vitest across the monorepo with core unit tests per package plus a
  full-pipeline orchestrator test, using a mock Anthropic client.

## Repository layout

```
AutoSocialAgent/
  package.json                 # workspaces root, shared scripts
  tsconfig.base.json           # shared compiler options
  vitest.config.ts             # root test config
  .env.example                 # ANTHROPIC_API_KEY, model id, etc.
  packages/
    core/                      # shared types, interfaces, errors, logger, AnthropicClient
    trend-detection/           # TrendDetector interface + stub impl
    content-generation/        # Anthropic-backed ContentGenerator
    review/                    # Anthropic self-critique ContentReviewer
    publishing/                # Publisher + 6 platform adapters
  apps/
    orchestrator/              # runPipeline() + CLI entrypoint
```

## Data flow

`Trend[] → ContentBrief → GeneratedContent → ReviewResult → PublishResult[]`

1. **trend-detection** returns ranked `Trend[]` behind a `TrendDetector`
   interface. Stub returns seeded mock trends.
2. **content-generation** takes a `Trend` + target platforms and calls Anthropic
   to produce platform-tailored `GeneratedContent` (caption/body, hashtags, and a
   YouTube script variant).
3. **review** runs an Anthropic self-critique call producing a `ReviewResult`
   (score, issues, suggested revision). The orchestrator enforces a configurable
   score threshold; below threshold triggers at most one regeneration pass.
4. **publishing** dispatches `GeneratedContent` to selected `PlatformAdapter`s.

## `core` package

Shared contracts so packages depend on interfaces, not each other's internals:

- **Types:** `Trend`, `ContentBrief`, `GeneratedContent`, `ReviewResult`,
  `PublishResult`, `PlatformName`.
- **Interfaces:** `TrendDetector`, `ContentGenerator`, `ContentReviewer`,
  `PlatformAdapter`, `Publisher`.
- **Infra:** typed config/env loader, small logger, error types
  (`GenerationError`, `ReviewError`, `PublishError`), and an `AnthropicClient`
  wrapper that centralizes model id (`claude-opus-4-7` / configurable) and
  prompt-caching setup. Used by both generation and review.

## Publishing adapters

One file per platform implementing a common `PlatformAdapter` interface
(`name`, `validate(content): ValidationResult`, `publish(content): Promise<PublishResult>`):

- **instagram**, **tiktok**, **twitter** (X), **youtube** (script/description
  package), **cms** (generic headless-CMS REST adapter).

Each adapter performs platform-specific validation (length caps, hashtag limits,
format rules) and a stubbed `publish()` returning a mock `PublishResult`
(`id`, `url`, `status`). Real API calls are marked TODO behind the same method.
Adapters never throw from `publish()` — failures return a failed `PublishResult`.

## Orchestrator app

- `runPipeline(config)` sequences the four stages and handles the
  regeneration-on-low-score path.
- CLI: `autosocial run --platforms instagram,tiktok --topic-source stub`.
  Loads config/env and prints per-stage results.

## Error handling

Typed errors in `core`. Adapters return failed `PublishResult`s rather than
throwing. The orchestrator collects per-platform results so one platform failing
does not abort the others. Generation/review errors surface with context and
abort the pipeline (no content to publish).

## Testing (Vitest)

Unit tests per package using a mock Anthropic client (no live API in tests):

- generation: produces expected `GeneratedContent` structure per platform.
- review: parses scores/issues correctly from a mocked critique response.
- each adapter: `validate()` enforces its platform rules; `publish()` returns a
  well-formed `PublishResult`.
- orchestrator: full pipeline runs end-to-end against stubs, including the
  low-score regeneration path and per-platform failure isolation.

## Out of scope (this build)

- Real OAuth / API integrations for any platform or trend source.
- Scheduling, queues, persistence/database, web UI.
- Media asset generation (images/video) — content is text/script only.
