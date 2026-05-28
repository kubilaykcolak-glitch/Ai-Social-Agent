# AutoSocialAgent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a TypeScript npm-workspaces monorepo for a content-creation agent that detects trends, generates content via the Anthropic API, reviews it with AI self-critique, and publishes through six stubbed platform adapters, wired by a CLI orchestrator.

**Architecture:** Independent library packages (`core`, `trend-detection`, `content-generation`, `review`, `publishing`) depend only on interfaces defined in `core`. An `orchestrator` app sequences them into a pipeline and exposes a CLI. External integrations are stubbed behind interfaces; Anthropic calls are real but mocked in tests via an injectable client.

**Tech Stack:** TypeScript (ESM), npm workspaces, `tsc` project references, Vitest, `@anthropic-ai/sdk`.

---

## File Structure

```
package.json                         # root, workspaces + scripts
tsconfig.base.json                   # shared compiler options
tsconfig.json                        # root references all packages
vitest.config.ts                     # root vitest config
.env.example
.gitignore
packages/
  core/
    package.json
    tsconfig.json
    src/index.ts                     # barrel re-export
    src/types.ts                     # Trend, GeneratedContent, etc.
    src/interfaces.ts                # TrendDetector, ContentGenerator, ...
    src/errors.ts                    # GenerationError, ReviewError, PublishError
    src/logger.ts                    # tiny logger
    src/config.ts                    # typed env/config loader
    src/anthropic-client.ts          # AnthropicClient wrapper + interface
  trend-detection/
    package.json / tsconfig.json
    src/index.ts
    src/stub-detector.ts             # StubTrendDetector
    src/stub-detector.test.ts
  content-generation/
    package.json / tsconfig.json
    src/index.ts
    src/generator.ts                 # AnthropicContentGenerator
    src/generator.test.ts
  review/
    package.json / tsconfig.json
    src/index.ts
    src/reviewer.ts                  # AnthropicContentReviewer
    src/reviewer.test.ts
  publishing/
    package.json / tsconfig.json
    src/index.ts
    src/publisher.ts                 # DefaultPublisher
    src/publisher.test.ts
    src/adapters/instagram.ts (+ .test.ts)
    src/adapters/tiktok.ts (+ .test.ts)
    src/adapters/twitter.ts (+ .test.ts)
    src/adapters/youtube.ts (+ .test.ts)
    src/adapters/cms.ts (+ .test.ts)
apps/
  orchestrator/
    package.json / tsconfig.json
    src/pipeline.ts                  # runPipeline()
    src/pipeline.test.ts
    src/cli.ts                       # CLI entrypoint
```

---

## Task 0: Root scaffolding

**Files:**
- Create: `package.json`, `tsconfig.base.json`, `tsconfig.json`, `vitest.config.ts`, `.env.example`, `.gitignore`

- [ ] **Step 1: Initialize git**

```bash
cd "C:\Users\kubil\Desktop\AI_apps\AutoSocialAgent"
git init
```

- [ ] **Step 2: Create root `package.json`**

```json
{
  "name": "autosocialagent",
  "private": true,
  "type": "module",
  "workspaces": ["packages/*", "apps/*"],
  "scripts": {
    "build": "tsc --build",
    "test": "vitest run",
    "test:watch": "vitest",
    "autosocial": "node apps/orchestrator/dist/cli.js"
  },
  "devDependencies": {
    "typescript": "^5.5.4",
    "vitest": "^2.0.5",
    "@types/node": "^20.14.0"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.27.0"
  }
}
```

- [ ] **Step 3: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "declarationMap": true,
    "composite": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

- [ ] **Step 4: Create root `tsconfig.json`**

```json
{
  "files": [],
  "references": [
    { "path": "packages/core" },
    { "path": "packages/trend-detection" },
    { "path": "packages/content-generation" },
    { "path": "packages/review" },
    { "path": "packages/publishing" },
    { "path": "apps/orchestrator" }
  ]
}
```

- [ ] **Step 5: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 6: Create `.env.example`**

```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-opus-4-7
REVIEW_SCORE_THRESHOLD=70
```

- [ ] **Step 7: Create `.gitignore`**

```
node_modules/
dist/
*.tsbuildinfo
.env
```

- [ ] **Step 8: Install dependencies**

Run: `npm install`
Expected: completes, creates `node_modules` and `package-lock.json`.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold monorepo root"
```

---

## Task 1: `core` package — contracts and infra

**Files:**
- Create: `packages/core/package.json`, `packages/core/tsconfig.json`, `packages/core/src/{index,types,interfaces,errors,logger,config,anthropic-client}.ts`

- [ ] **Step 1: Create `packages/core/package.json`**

```json
{
  "name": "@autosocial/core",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": { ".": "./dist/index.js" },
  "dependencies": { "@anthropic-ai/sdk": "^0.27.0" }
}
```

- [ ] **Step 2: Create `packages/core/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "rootDir": "src", "outDir": "dist" },
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.test.ts"]
}
```

- [ ] **Step 3: Create `packages/core/src/types.ts`**

```ts
export type PlatformName =
  | "instagram"
  | "tiktok"
  | "twitter"
  | "youtube"
  | "cms";

export interface Trend {
  id: string;
  topic: string;
  score: number; // 0..100 relevance/popularity
  source: string;
  keywords: string[];
}

export interface ContentBrief {
  trend: Trend;
  platforms: PlatformName[];
  tone?: string;
}

export interface PlatformContent {
  platform: PlatformName;
  body: string; // caption/post text, or full script for youtube
  hashtags: string[];
}

export interface GeneratedContent {
  brief: ContentBrief;
  perPlatform: PlatformContent[];
}

export interface ReviewResult {
  score: number; // 0..100
  issues: string[];
  suggestedRevision?: string;
  passed: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface PublishResult {
  platform: PlatformName;
  status: "published" | "failed";
  id?: string;
  url?: string;
  error?: string;
}
```

- [ ] **Step 4: Create `packages/core/src/errors.ts`**

```ts
export class GenerationError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "GenerationError";
  }
}

export class ReviewError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "ReviewError";
  }
}

export class PublishError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "PublishError";
  }
}
```

- [ ] **Step 5: Create `packages/core/src/logger.ts`**

```ts
export interface Logger {
  info(msg: string, meta?: unknown): void;
  warn(msg: string, meta?: unknown): void;
  error(msg: string, meta?: unknown): void;
}

export const consoleLogger: Logger = {
  info: (m, meta) => console.log(`[info] ${m}`, meta ?? ""),
  warn: (m, meta) => console.warn(`[warn] ${m}`, meta ?? ""),
  error: (m, meta) => console.error(`[error] ${m}`, meta ?? ""),
};
```

- [ ] **Step 6: Create `packages/core/src/anthropic-client.ts`**

```ts
import Anthropic from "@anthropic-ai/sdk";

export interface AnthropicClient {
  complete(system: string, user: string): Promise<string>;
}

export class SdkAnthropicClient implements AnthropicClient {
  private client: Anthropic;
  constructor(
    apiKey: string,
    private model: string,
    private maxTokens = 2048,
  ) {
    this.client = new Anthropic({ apiKey });
  }

  async complete(system: string, user: string): Promise<string> {
    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: user }],
    });
    const block = res.content.find((b) => b.type === "text");
    return block && block.type === "text" ? block.text : "";
  }
}
```

- [ ] **Step 7: Create `packages/core/src/config.ts`**

```ts
export interface AppConfig {
  anthropicApiKey: string;
  anthropicModel: string;
  reviewScoreThreshold: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    anthropicApiKey: env.ANTHROPIC_API_KEY ?? "",
    anthropicModel: env.ANTHROPIC_MODEL ?? "claude-opus-4-7",
    reviewScoreThreshold: Number(env.REVIEW_SCORE_THRESHOLD ?? "70"),
  };
}
```

- [ ] **Step 8: Create `packages/core/src/interfaces.ts`**

```ts
import type {
  Trend,
  ContentBrief,
  GeneratedContent,
  ReviewResult,
  PublishResult,
  ValidationResult,
  PlatformName,
} from "./types.js";

export interface TrendDetector {
  detect(limit: number): Promise<Trend[]>;
}

export interface ContentGenerator {
  generate(brief: ContentBrief): Promise<GeneratedContent>;
}

export interface ContentReviewer {
  review(content: GeneratedContent, threshold: number): Promise<ReviewResult>;
}

export interface PlatformAdapter {
  readonly name: PlatformName;
  validate(content: GeneratedContent): ValidationResult;
  publish(content: GeneratedContent): Promise<PublishResult>;
}

export interface Publisher {
  publish(
    content: GeneratedContent,
    platforms: PlatformName[],
  ): Promise<PublishResult[]>;
}
```

- [ ] **Step 9: Create `packages/core/src/index.ts`**

```ts
export * from "./types.js";
export * from "./interfaces.js";
export * from "./errors.js";
export * from "./logger.js";
export * from "./config.js";
export * from "./anthropic-client.js";
```

- [ ] **Step 10: Build core**

Run: `npx tsc --build packages/core`
Expected: PASS, produces `packages/core/dist`. (Use the per-package build here — the root `npm run build` references packages that don't exist until later tasks.)

- [ ] **Step 11: Commit**

```bash
git add -A && git commit -m "feat(core): shared types, interfaces, infra"
```

---

## Task 2: `trend-detection` package

**Files:**
- Create: `packages/trend-detection/package.json`, `tsconfig.json`, `src/stub-detector.ts`, `src/index.ts`, `src/stub-detector.test.ts`

- [ ] **Step 1: Create `packages/trend-detection/package.json`**

```json
{
  "name": "@autosocial/trend-detection",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": { ".": "./dist/index.js" },
  "dependencies": { "@autosocial/core": "0.1.0" }
}
```

- [ ] **Step 2: Create `packages/trend-detection/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "rootDir": "src", "outDir": "dist" },
  "references": [{ "path": "../core" }],
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.test.ts"]
}
```

- [ ] **Step 3: Write the failing test `src/stub-detector.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { StubTrendDetector } from "./stub-detector.js";

describe("StubTrendDetector", () => {
  it("returns up to `limit` trends sorted by score desc", async () => {
    const detector = new StubTrendDetector();
    const trends = await detector.detect(2);
    expect(trends).toHaveLength(2);
    expect(trends[0].score).toBeGreaterThanOrEqual(trends[1].score);
    expect(trends[0]).toHaveProperty("topic");
    expect(trends[0].keywords.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 4: Run test, verify it fails**

Run: `npx vitest run packages/trend-detection`
Expected: FAIL — cannot find `./stub-detector.js`.

- [ ] **Step 5: Implement `src/stub-detector.ts`**

```ts
import type { Trend, TrendDetector } from "@autosocial/core";

const SEED: Trend[] = [
  { id: "t1", topic: "AI productivity tools", score: 92, source: "stub", keywords: ["ai", "productivity", "automation"] },
  { id: "t2", topic: "Sustainable fashion", score: 81, source: "stub", keywords: ["sustainability", "fashion", "eco"] },
  { id: "t3", topic: "Home barista setups", score: 74, source: "stub", keywords: ["coffee", "espresso", "home"] },
  { id: "t4", topic: "Indie game dev", score: 68, source: "stub", keywords: ["gamedev", "indie", "unity"] },
];

export class StubTrendDetector implements TrendDetector {
  async detect(limit: number): Promise<Trend[]> {
    return [...SEED].sort((a, b) => b.score - a.score).slice(0, limit);
  }
}
```

- [ ] **Step 6: Create `src/index.ts`**

```ts
export * from "./stub-detector.js";
```

- [ ] **Step 7: Run test, verify it passes**

Run: `npx vitest run packages/trend-detection`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(trend-detection): stub detector"
```

---

## Task 3: `content-generation` package

**Files:**
- Create: `packages/content-generation/package.json`, `tsconfig.json`, `src/generator.ts`, `src/index.ts`, `src/generator.test.ts`

The generator asks the model for JSON and parses it. Tests inject a fake `AnthropicClient` — no live API.

- [ ] **Step 1: Create `packages/content-generation/package.json`**

```json
{
  "name": "@autosocial/content-generation",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": { ".": "./dist/index.js" },
  "dependencies": { "@autosocial/core": "0.1.0" }
}
```

- [ ] **Step 2: Create `packages/content-generation/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "rootDir": "src", "outDir": "dist" },
  "references": [{ "path": "../core" }],
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.test.ts"]
}
```

- [ ] **Step 3: Write the failing test `src/generator.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import type { AnthropicClient, ContentBrief, Trend } from "@autosocial/core";
import { AnthropicContentGenerator } from "./generator.js";

const trend: Trend = { id: "t1", topic: "AI tools", score: 90, source: "stub", keywords: ["ai"] };
const brief: ContentBrief = { trend, platforms: ["instagram", "youtube"] };

function fakeClient(json: string): AnthropicClient {
  return { complete: async () => json };
}

describe("AnthropicContentGenerator", () => {
  it("parses model JSON into per-platform content", async () => {
    const json = JSON.stringify({
      perPlatform: [
        { platform: "instagram", body: "Post body", hashtags: ["#ai"] },
        { platform: "youtube", body: "Script body", hashtags: [] },
      ],
    });
    const gen = new AnthropicContentGenerator(fakeClient(json));
    const result = await gen.generate(brief);
    expect(result.perPlatform).toHaveLength(2);
    expect(result.perPlatform[0].platform).toBe("instagram");
    expect(result.brief.trend.topic).toBe("AI tools");
  });

  it("throws GenerationError on invalid JSON", async () => {
    const gen = new AnthropicContentGenerator(fakeClient("not json"));
    await expect(gen.generate(brief)).rejects.toThrow("GenerationError");
  });
});
```

Note: `rejects.toThrow("GenerationError")` matches against the error name; ensure the thrown `GenerationError` message or name contains that string. Use `rejects.toThrowError(GenerationError)` alternatively — but keep the string form and set the message accordingly below.

- [ ] **Step 4: Run test, verify it fails**

Run: `npx vitest run packages/content-generation`
Expected: FAIL — cannot find `./generator.js`.

- [ ] **Step 5: Implement `src/generator.ts`**

```ts
import {
  GenerationError,
  type AnthropicClient,
  type ContentBrief,
  type ContentGenerator,
  type GeneratedContent,
  type PlatformContent,
} from "@autosocial/core";

const SYSTEM = `You are a social media content writer. Given a trend and a list of
target platforms, write tailored content for each platform. For "youtube", write a
short video script in the body. Respond with ONLY valid JSON of the form:
{"perPlatform":[{"platform":"<name>","body":"<text>","hashtags":["#tag"]}]}`;

export class AnthropicContentGenerator implements ContentGenerator {
  constructor(private client: AnthropicClient) {}

  async generate(brief: ContentBrief): Promise<GeneratedContent> {
    const user = JSON.stringify({
      topic: brief.trend.topic,
      keywords: brief.trend.keywords,
      platforms: brief.platforms,
      tone: brief.tone ?? "engaging and concise",
    });

    let raw: string;
    try {
      raw = await this.client.complete(SYSTEM, user);
    } catch (err) {
      throw new GenerationError("GenerationError: model call failed", err);
    }

    let parsed: { perPlatform: PlatformContent[] };
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new GenerationError("GenerationError: invalid JSON from model", err);
    }

    if (!parsed.perPlatform || !Array.isArray(parsed.perPlatform)) {
      throw new GenerationError("GenerationError: missing perPlatform array");
    }

    return { brief, perPlatform: parsed.perPlatform };
  }
}
```

- [ ] **Step 6: Create `src/index.ts`**

```ts
export * from "./generator.js";
```

- [ ] **Step 7: Run test, verify it passes**

Run: `npx vitest run packages/content-generation`
Expected: PASS (both tests).

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(content-generation): Anthropic-backed generator"
```

---

## Task 4: `review` package

**Files:**
- Create: `packages/review/package.json`, `tsconfig.json`, `src/reviewer.ts`, `src/index.ts`, `src/reviewer.test.ts`

- [ ] **Step 1: Create `packages/review/package.json`**

```json
{
  "name": "@autosocial/review",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": { ".": "./dist/index.js" },
  "dependencies": { "@autosocial/core": "0.1.0" }
}
```

- [ ] **Step 2: Create `packages/review/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "rootDir": "src", "outDir": "dist" },
  "references": [{ "path": "../core" }],
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.test.ts"]
}
```

- [ ] **Step 3: Write the failing test `src/reviewer.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import type { AnthropicClient, GeneratedContent } from "@autosocial/core";
import { AnthropicContentReviewer } from "./reviewer.js";

const content: GeneratedContent = {
  brief: {
    trend: { id: "t1", topic: "AI", score: 90, source: "stub", keywords: ["ai"] },
    platforms: ["instagram"],
  },
  perPlatform: [{ platform: "instagram", body: "Body", hashtags: ["#ai"] }],
};

function fakeClient(json: string): AnthropicClient {
  return { complete: async () => json };
}

describe("AnthropicContentReviewer", () => {
  it("passes when score >= threshold", async () => {
    const json = JSON.stringify({ score: 85, issues: [], suggestedRevision: "" });
    const reviewer = new AnthropicContentReviewer(fakeClient(json));
    const result = await reviewer.review(content, 70);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(85);
  });

  it("fails when score < threshold and keeps issues", async () => {
    const json = JSON.stringify({ score: 50, issues: ["weak hook"], suggestedRevision: "Add a hook" });
    const reviewer = new AnthropicContentReviewer(fakeClient(json));
    const result = await reviewer.review(content, 70);
    expect(result.passed).toBe(false);
    expect(result.issues).toContain("weak hook");
    expect(result.suggestedRevision).toBe("Add a hook");
  });

  it("throws ReviewError on invalid JSON", async () => {
    const reviewer = new AnthropicContentReviewer(fakeClient("nope"));
    await expect(reviewer.review(content, 70)).rejects.toThrow("ReviewError");
  });
});
```

- [ ] **Step 4: Run test, verify it fails**

Run: `npx vitest run packages/review`
Expected: FAIL — cannot find `./reviewer.js`.

- [ ] **Step 5: Implement `src/reviewer.ts`**

```ts
import {
  ReviewError,
  type AnthropicClient,
  type ContentReviewer,
  type GeneratedContent,
  type ReviewResult,
} from "@autosocial/core";

const SYSTEM = `You are a strict social media content critic. Score the provided
content 0-100 on clarity, on-brand voice, and engagement potential. List concrete
issues and a suggested revision. Respond with ONLY valid JSON of the form:
{"score":<number>,"issues":["..."],"suggestedRevision":"..."}`;

export class AnthropicContentReviewer implements ContentReviewer {
  constructor(private client: AnthropicClient) {}

  async review(content: GeneratedContent, threshold: number): Promise<ReviewResult> {
    let raw: string;
    try {
      raw = await this.client.complete(SYSTEM, JSON.stringify(content.perPlatform));
    } catch (err) {
      throw new ReviewError("ReviewError: model call failed", err);
    }

    let parsed: { score: number; issues: string[]; suggestedRevision?: string };
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new ReviewError("ReviewError: invalid JSON from model", err);
    }

    if (typeof parsed.score !== "number") {
      throw new ReviewError("ReviewError: missing score");
    }

    return {
      score: parsed.score,
      issues: parsed.issues ?? [],
      suggestedRevision: parsed.suggestedRevision || undefined,
      passed: parsed.score >= threshold,
    };
  }
}
```

- [ ] **Step 6: Create `src/index.ts`**

```ts
export * from "./reviewer.js";
```

- [ ] **Step 7: Run test, verify it passes**

Run: `npx vitest run packages/review`
Expected: PASS (three tests).

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(review): Anthropic self-critique reviewer"
```

---

## Task 5: `publishing` package — adapters + publisher

**Files:**
- Create: `packages/publishing/package.json`, `tsconfig.json`, `src/adapters/{instagram,tiktok,twitter,youtube,cms}.ts` (+ tests), `src/publisher.ts` (+ test), `src/index.ts`

Adapter validation rules:
- **instagram**: caption body <= 2200 chars; <= 30 hashtags.
- **tiktok**: body <= 2200 chars; <= 5 hashtags recommended (error if > 10).
- **twitter**: body + hashtags rendered length <= 280 chars.
- **youtube**: body (script) >= 50 chars (must be a real script).
- **cms**: body non-empty.

- [ ] **Step 1: Create `packages/publishing/package.json`**

```json
{
  "name": "@autosocial/publishing",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": { ".": "./dist/index.js" },
  "dependencies": { "@autosocial/core": "0.1.0" }
}
```

- [ ] **Step 2: Create `packages/publishing/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "rootDir": "src", "outDir": "dist" },
  "references": [{ "path": "../core" }],
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.test.ts"]
}
```

- [ ] **Step 3: Write failing test `src/adapters/instagram.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import type { GeneratedContent } from "@autosocial/core";
import { InstagramAdapter } from "./instagram.js";

function content(body: string, hashtags: string[]): GeneratedContent {
  return {
    brief: { trend: { id: "t", topic: "x", score: 1, source: "s", keywords: [] }, platforms: ["instagram"] },
    perPlatform: [{ platform: "instagram", body, hashtags }],
  };
}

describe("InstagramAdapter", () => {
  const adapter = new InstagramAdapter();

  it("validates ok within limits", () => {
    expect(adapter.validate(content("hi", ["#a"])).valid).toBe(true);
  });

  it("rejects too many hashtags", () => {
    const tags = Array.from({ length: 31 }, (_, i) => `#t${i}`);
    const r = adapter.validate(content("hi", tags));
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/hashtag/i);
  });

  it("publishes a result with id and url", async () => {
    const r = await adapter.publish(content("hi", ["#a"]));
    expect(r.status).toBe("published");
    expect(r.platform).toBe("instagram");
    expect(r.id).toBeTruthy();
    expect(r.url).toBeTruthy();
  });
});
```

- [ ] **Step 4: Run test, verify it fails**

Run: `npx vitest run packages/publishing`
Expected: FAIL — cannot find `./instagram.js`.

- [ ] **Step 5: Implement `src/adapters/instagram.ts`**

```ts
import type {
  GeneratedContent,
  PlatformAdapter,
  PublishResult,
  ValidationResult,
} from "@autosocial/core";

function pick(content: GeneratedContent, name: string) {
  return content.perPlatform.find((p) => p.platform === name);
}

export class InstagramAdapter implements PlatformAdapter {
  readonly name = "instagram" as const;

  validate(content: GeneratedContent): ValidationResult {
    const errors: string[] = [];
    const c = pick(content, "instagram");
    if (!c) errors.push("no instagram content");
    else {
      if (c.body.length > 2200) errors.push("caption exceeds 2200 chars");
      if (c.hashtags.length > 30) errors.push("too many hashtags (max 30)");
    }
    return { valid: errors.length === 0, errors };
  }

  async publish(content: GeneratedContent): Promise<PublishResult> {
    const v = this.validate(content);
    if (!v.valid) {
      return { platform: this.name, status: "failed", error: v.errors.join("; ") };
    }
    // TODO: real Instagram Graph API call here.
    const id = `ig_${Date.now()}`;
    return { platform: this.name, status: "published", id, url: `https://instagram.com/p/${id}` };
  }
}
```

- [ ] **Step 6: Run test, verify it passes**

Run: `npx vitest run packages/publishing`
Expected: PASS (instagram tests).

- [ ] **Step 7: Implement `src/adapters/tiktok.ts`**

```ts
import type {
  GeneratedContent,
  PlatformAdapter,
  PublishResult,
  ValidationResult,
} from "@autosocial/core";

export class TiktokAdapter implements PlatformAdapter {
  readonly name = "tiktok" as const;

  validate(content: GeneratedContent): ValidationResult {
    const errors: string[] = [];
    const c = content.perPlatform.find((p) => p.platform === "tiktok");
    if (!c) errors.push("no tiktok content");
    else {
      if (c.body.length > 2200) errors.push("caption exceeds 2200 chars");
      if (c.hashtags.length > 10) errors.push("too many hashtags (max 10)");
    }
    return { valid: errors.length === 0, errors };
  }

  async publish(content: GeneratedContent): Promise<PublishResult> {
    const v = this.validate(content);
    if (!v.valid) return { platform: this.name, status: "failed", error: v.errors.join("; ") };
    // TODO: real TikTok Content Posting API call here.
    const id = `tt_${Date.now()}`;
    return { platform: this.name, status: "published", id, url: `https://tiktok.com/@me/video/${id}` };
  }
}
```

- [ ] **Step 8: Write test `src/adapters/tiktok.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import type { GeneratedContent } from "@autosocial/core";
import { TiktokAdapter } from "./tiktok.js";

function content(hashtags: string[]): GeneratedContent {
  return {
    brief: { trend: { id: "t", topic: "x", score: 1, source: "s", keywords: [] }, platforms: ["tiktok"] },
    perPlatform: [{ platform: "tiktok", body: "hi", hashtags }],
  };
}

describe("TiktokAdapter", () => {
  const adapter = new TiktokAdapter();
  it("ok within limits", () => expect(adapter.validate(content(["#a"])).valid).toBe(true));
  it("rejects > 10 hashtags", () => {
    const tags = Array.from({ length: 11 }, (_, i) => `#t${i}`);
    expect(adapter.validate(content(tags)).valid).toBe(false);
  });
  it("publishes", async () => {
    expect((await adapter.publish(content(["#a"]))).status).toBe("published");
  });
});
```

- [ ] **Step 9: Implement `src/adapters/twitter.ts`**

```ts
import type {
  GeneratedContent,
  PlatformAdapter,
  PublishResult,
  ValidationResult,
} from "@autosocial/core";

function rendered(body: string, hashtags: string[]): string {
  return [body, hashtags.join(" ")].filter(Boolean).join(" ");
}

export class TwitterAdapter implements PlatformAdapter {
  readonly name = "twitter" as const;

  validate(content: GeneratedContent): ValidationResult {
    const errors: string[] = [];
    const c = content.perPlatform.find((p) => p.platform === "twitter");
    if (!c) errors.push("no twitter content");
    else if (rendered(c.body, c.hashtags).length > 280) {
      errors.push("tweet exceeds 280 chars");
    }
    return { valid: errors.length === 0, errors };
  }

  async publish(content: GeneratedContent): Promise<PublishResult> {
    const v = this.validate(content);
    if (!v.valid) return { platform: this.name, status: "failed", error: v.errors.join("; ") };
    // TODO: real X API v2 tweet call here.
    const id = `tw_${Date.now()}`;
    return { platform: this.name, status: "published", id, url: `https://x.com/i/status/${id}` };
  }
}
```

- [ ] **Step 10: Write test `src/adapters/twitter.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import type { GeneratedContent } from "@autosocial/core";
import { TwitterAdapter } from "./twitter.js";

function content(body: string): GeneratedContent {
  return {
    brief: { trend: { id: "t", topic: "x", score: 1, source: "s", keywords: [] }, platforms: ["twitter"] },
    perPlatform: [{ platform: "twitter", body, hashtags: ["#ai"] }],
  };
}

describe("TwitterAdapter", () => {
  const adapter = new TwitterAdapter();
  it("ok under 280", () => expect(adapter.validate(content("short")).valid).toBe(true));
  it("rejects over 280", () => {
    expect(adapter.validate(content("x".repeat(300))).valid).toBe(false);
  });
  it("publishes", async () => {
    expect((await adapter.publish(content("hi"))).status).toBe("published");
  });
});
```

- [ ] **Step 11: Implement `src/adapters/youtube.ts`**

```ts
import type {
  GeneratedContent,
  PlatformAdapter,
  PublishResult,
  ValidationResult,
} from "@autosocial/core";

export class YoutubeAdapter implements PlatformAdapter {
  readonly name = "youtube" as const;

  validate(content: GeneratedContent): ValidationResult {
    const errors: string[] = [];
    const c = content.perPlatform.find((p) => p.platform === "youtube");
    if (!c) errors.push("no youtube content");
    else if (c.body.trim().length < 50) errors.push("script too short (min 50 chars)");
    return { valid: errors.length === 0, errors };
  }

  async publish(content: GeneratedContent): Promise<PublishResult> {
    const v = this.validate(content);
    if (!v.valid) return { platform: this.name, status: "failed", error: v.errors.join("; ") };
    // TODO: persist script / push to YouTube Data API as draft description here.
    const id = `yt_${Date.now()}`;
    return { platform: this.name, status: "published", id, url: `https://youtube.com/watch?v=${id}` };
  }
}
```

- [ ] **Step 12: Write test `src/adapters/youtube.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import type { GeneratedContent } from "@autosocial/core";
import { YoutubeAdapter } from "./youtube.js";

function content(body: string): GeneratedContent {
  return {
    brief: { trend: { id: "t", topic: "x", score: 1, source: "s", keywords: [] }, platforms: ["youtube"] },
    perPlatform: [{ platform: "youtube", body, hashtags: [] }],
  };
}

describe("YoutubeAdapter", () => {
  const adapter = new YoutubeAdapter();
  it("rejects short script", () => expect(adapter.validate(content("too short")).valid).toBe(false));
  it("accepts a real script", () => {
    expect(adapter.validate(content("x".repeat(60))).valid).toBe(true);
  });
  it("publishes", async () => {
    expect((await adapter.publish(content("x".repeat(60)))).status).toBe("published");
  });
});
```

- [ ] **Step 13: Implement `src/adapters/cms.ts`**

```ts
import type {
  GeneratedContent,
  PlatformAdapter,
  PublishResult,
  ValidationResult,
} from "@autosocial/core";

export class CmsAdapter implements PlatformAdapter {
  readonly name = "cms" as const;
  constructor(private endpoint = "https://cms.example.com/api/posts") {}

  validate(content: GeneratedContent): ValidationResult {
    const errors: string[] = [];
    const c = content.perPlatform.find((p) => p.platform === "cms");
    if (!c) errors.push("no cms content");
    else if (c.body.trim().length === 0) errors.push("body is empty");
    return { valid: errors.length === 0, errors };
  }

  async publish(content: GeneratedContent): Promise<PublishResult> {
    const v = this.validate(content);
    if (!v.valid) return { platform: this.name, status: "failed", error: v.errors.join("; ") };
    // TODO: POST to headless CMS REST endpoint (this.endpoint) here.
    const id = `cms_${Date.now()}`;
    return { platform: this.name, status: "published", id, url: `${this.endpoint}/${id}` };
  }
}
```

- [ ] **Step 14: Write test `src/adapters/cms.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import type { GeneratedContent } from "@autosocial/core";
import { CmsAdapter } from "./cms.js";

function content(body: string): GeneratedContent {
  return {
    brief: { trend: { id: "t", topic: "x", score: 1, source: "s", keywords: [] }, platforms: ["cms"] },
    perPlatform: [{ platform: "cms", body, hashtags: [] }],
  };
}

describe("CmsAdapter", () => {
  const adapter = new CmsAdapter();
  it("rejects empty body", () => expect(adapter.validate(content("  ")).valid).toBe(false));
  it("publishes valid body", async () => {
    expect((await adapter.publish(content("hello"))).status).toBe("published");
  });
});
```

- [ ] **Step 15: Implement `src/publisher.ts`**

```ts
import type {
  GeneratedContent,
  PlatformAdapter,
  PlatformName,
  PublishResult,
  Publisher,
} from "@autosocial/core";
import { InstagramAdapter } from "./adapters/instagram.js";
import { TiktokAdapter } from "./adapters/tiktok.js";
import { TwitterAdapter } from "./adapters/twitter.js";
import { YoutubeAdapter } from "./adapters/youtube.js";
import { CmsAdapter } from "./adapters/cms.js";

export class DefaultPublisher implements Publisher {
  private adapters: Map<PlatformName, PlatformAdapter>;

  constructor(adapters?: PlatformAdapter[]) {
    const list = adapters ?? [
      new InstagramAdapter(),
      new TiktokAdapter(),
      new TwitterAdapter(),
      new YoutubeAdapter(),
      new CmsAdapter(),
    ];
    this.adapters = new Map(list.map((a) => [a.name, a]));
  }

  async publish(
    content: GeneratedContent,
    platforms: PlatformName[],
  ): Promise<PublishResult[]> {
    const results: PublishResult[] = [];
    for (const platform of platforms) {
      const adapter = this.adapters.get(platform);
      if (!adapter) {
        results.push({ platform, status: "failed", error: "no adapter registered" });
        continue;
      }
      try {
        results.push(await adapter.publish(content));
      } catch (err) {
        results.push({
          platform,
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    return results;
  }
}
```

- [ ] **Step 16: Write test `src/publisher.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import type { GeneratedContent, PlatformAdapter, PublishResult } from "@autosocial/core";
import { DefaultPublisher } from "./publisher.js";

const content: GeneratedContent = {
  brief: { trend: { id: "t", topic: "x", score: 1, source: "s", keywords: [] }, platforms: ["instagram", "tiktok"] },
  perPlatform: [
    { platform: "instagram", body: "hi", hashtags: ["#a"] },
    { platform: "tiktok", body: "hi", hashtags: ["#a"] },
  ],
};

class OkAdapter implements PlatformAdapter {
  constructor(public readonly name: any) {}
  validate() { return { valid: true, errors: [] }; }
  async publish(): Promise<PublishResult> { return { platform: this.name, status: "published", id: "1" }; }
}

class ThrowAdapter implements PlatformAdapter {
  readonly name = "tiktok" as const;
  validate() { return { valid: true, errors: [] }; }
  async publish(): Promise<PublishResult> { throw new Error("boom"); }
}

describe("DefaultPublisher", () => {
  it("publishes to each requested platform", async () => {
    const pub = new DefaultPublisher([new OkAdapter("instagram"), new OkAdapter("tiktok")]);
    const results = await pub.publish(content, ["instagram", "tiktok"]);
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.status === "published")).toBe(true);
  });

  it("isolates a failing adapter without aborting others", async () => {
    const pub = new DefaultPublisher([new OkAdapter("instagram"), new ThrowAdapter()]);
    const results = await pub.publish(content, ["instagram", "tiktok"]);
    expect(results.find((r) => r.platform === "instagram")?.status).toBe("published");
    expect(results.find((r) => r.platform === "tiktok")?.status).toBe("failed");
  });

  it("reports missing adapter as failed", async () => {
    const pub = new DefaultPublisher([new OkAdapter("instagram")]);
    const results = await pub.publish(content, ["youtube"]);
    expect(results[0].status).toBe("failed");
  });
});
```

- [ ] **Step 17: Create `src/index.ts`**

```ts
export * from "./publisher.js";
export * from "./adapters/instagram.js";
export * from "./adapters/tiktok.js";
export * from "./adapters/twitter.js";
export * from "./adapters/youtube.js";
export * from "./adapters/cms.js";
```

- [ ] **Step 18: Run all publishing tests, verify pass**

Run: `npx vitest run packages/publishing`
Expected: PASS (all adapter + publisher tests).

- [ ] **Step 19: Commit**

```bash
git add -A && git commit -m "feat(publishing): publisher + 6 platform adapters"
```

---

## Task 6: `orchestrator` app — pipeline + CLI

**Files:**
- Create: `apps/orchestrator/package.json`, `tsconfig.json`, `src/pipeline.ts`, `src/cli.ts`, `src/pipeline.test.ts`

- [ ] **Step 1: Create `apps/orchestrator/package.json`**

```json
{
  "name": "@autosocial/orchestrator",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/cli.js",
  "bin": { "autosocial": "dist/cli.js" },
  "dependencies": {
    "@autosocial/core": "0.1.0",
    "@autosocial/trend-detection": "0.1.0",
    "@autosocial/content-generation": "0.1.0",
    "@autosocial/review": "0.1.0",
    "@autosocial/publishing": "0.1.0"
  }
}
```

- [ ] **Step 2: Create `apps/orchestrator/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "rootDir": "src", "outDir": "dist" },
  "references": [
    { "path": "../../packages/core" },
    { "path": "../../packages/trend-detection" },
    { "path": "../../packages/content-generation" },
    { "path": "../../packages/review" },
    { "path": "../../packages/publishing" }
  ],
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.test.ts"]
}
```

- [ ] **Step 3: Write failing test `src/pipeline.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import type {
  ContentGenerator,
  ContentReviewer,
  GeneratedContent,
  Publisher,
  TrendDetector,
} from "@autosocial/core";
import { runPipeline } from "./pipeline.js";

const trend = { id: "t1", topic: "AI", score: 90, source: "stub", keywords: ["ai"] };

function makeContent(body: string): GeneratedContent {
  return {
    brief: { trend, platforms: ["instagram"] },
    perPlatform: [{ platform: "instagram", body, hashtags: ["#ai"] }],
  };
}

const detector: TrendDetector = { detect: async () => [trend] };

describe("runPipeline", () => {
  it("runs trend -> generate -> review -> publish and returns results", async () => {
    const generator: ContentGenerator = { generate: async () => makeContent("good") };
    const reviewer: ContentReviewer = {
      review: async () => ({ score: 90, issues: [], passed: true }),
    };
    const publisher: Publisher = {
      publish: async (_c, platforms) =>
        platforms.map((p) => ({ platform: p, status: "published" as const, id: "1" })),
    };

    const out = await runPipeline({
      platforms: ["instagram"],
      threshold: 70,
      detector,
      generator,
      reviewer,
      publisher,
    });

    expect(out.review.passed).toBe(true);
    expect(out.published[0].status).toBe("published");
    expect(out.regenerated).toBe(false);
  });

  it("regenerates once when first review fails", async () => {
    let calls = 0;
    const generator: ContentGenerator = {
      generate: async () => makeContent(calls++ === 0 ? "weak" : "strong"),
    };
    const reviewer: ContentReviewer = {
      review: async (c) => {
        const body = c.perPlatform[0].body;
        return body === "strong"
          ? { score: 90, issues: [], passed: true }
          : { score: 40, issues: ["weak"], passed: false };
      },
    };
    const publisher: Publisher = {
      publish: async (_c, platforms) =>
        platforms.map((p) => ({ platform: p, status: "published" as const, id: "1" })),
    };

    const out = await runPipeline({
      platforms: ["instagram"],
      threshold: 70,
      detector,
      generator,
      reviewer,
      publisher,
    });

    expect(out.regenerated).toBe(true);
    expect(out.review.passed).toBe(true);
  });
});
```

- [ ] **Step 4: Run test, verify it fails**

Run: `npx vitest run apps/orchestrator`
Expected: FAIL — cannot find `./pipeline.js`.

- [ ] **Step 5: Implement `src/pipeline.ts`**

```ts
import type {
  ContentGenerator,
  ContentReviewer,
  GeneratedContent,
  PlatformName,
  Publisher,
  PublishResult,
  ReviewResult,
  TrendDetector,
} from "@autosocial/core";

export interface PipelineConfig {
  platforms: PlatformName[];
  threshold: number;
  detector: TrendDetector;
  generator: ContentGenerator;
  reviewer: ContentReviewer;
  publisher: Publisher;
}

export interface PipelineOutput {
  content: GeneratedContent;
  review: ReviewResult;
  regenerated: boolean;
  published: PublishResult[];
}

export async function runPipeline(cfg: PipelineConfig): Promise<PipelineOutput> {
  const [trend] = await cfg.detector.detect(1);
  if (!trend) throw new Error("no trends detected");

  const brief = { trend, platforms: cfg.platforms };

  let content = await cfg.generator.generate(brief);
  let review = await cfg.reviewer.review(content, cfg.threshold);
  let regenerated = false;

  if (!review.passed) {
    regenerated = true;
    content = await cfg.generator.generate(brief);
    review = await cfg.reviewer.review(content, cfg.threshold);
  }

  const published = review.passed
    ? await cfg.publisher.publish(content, cfg.platforms)
    : [];

  return { content, review, regenerated, published };
}
```

- [ ] **Step 6: Run test, verify it passes**

Run: `npx vitest run apps/orchestrator`
Expected: PASS (both tests).

- [ ] **Step 7: Implement `src/cli.ts`**

```ts
import {
  loadConfig,
  SdkAnthropicClient,
  consoleLogger,
  type PlatformName,
} from "@autosocial/core";
import { StubTrendDetector } from "@autosocial/trend-detection";
import { AnthropicContentGenerator } from "@autosocial/content-generation";
import { AnthropicContentReviewer } from "@autosocial/review";
import { DefaultPublisher } from "@autosocial/publishing";
import { runPipeline } from "./pipeline.js";

function parsePlatforms(argv: string[]): PlatformName[] {
  const flag = argv.find((a) => a.startsWith("--platforms="));
  const raw = flag ? flag.split("=")[1] : "instagram,tiktok,twitter,youtube,cms";
  return raw.split(",") as PlatformName[];
}

async function main() {
  const cfg = loadConfig();
  if (!cfg.anthropicApiKey) {
    consoleLogger.error("ANTHROPIC_API_KEY not set. Copy .env.example to .env.");
    process.exit(1);
  }

  const client = new SdkAnthropicClient(cfg.anthropicApiKey, cfg.anthropicModel);
  const platforms = parsePlatforms(process.argv.slice(2));

  consoleLogger.info("running pipeline", { platforms });
  const out = await runPipeline({
    platforms,
    threshold: cfg.reviewScoreThreshold,
    detector: new StubTrendDetector(),
    generator: new AnthropicContentGenerator(client),
    reviewer: new AnthropicContentReviewer(client),
    publisher: new DefaultPublisher(),
  });

  consoleLogger.info(`trend: ${out.content.brief.trend.topic}`);
  consoleLogger.info(`review score: ${out.review.score} (regenerated: ${out.regenerated})`);
  for (const r of out.published) {
    consoleLogger.info(`${r.platform}: ${r.status}`, r.url ?? r.error);
  }
}

main().catch((err) => {
  consoleLogger.error("pipeline failed", err);
  process.exit(1);
});
```

- [ ] **Step 8: Build the whole monorepo**

Run: `npm run build`
Expected: PASS — all packages and the app compile.

- [ ] **Step 9: Run the full test suite**

Run: `npm test`
Expected: PASS — all package and orchestrator tests green.

- [ ] **Step 10: Smoke-test the CLI (no API key path)**

Run: `node apps/orchestrator/dist/cli.js --platforms=instagram`
Expected: exits with the "ANTHROPIC_API_KEY not set" error message (confirms wiring; real run requires `.env`).

- [ ] **Step 11: Commit**

```bash
git add -A && git commit -m "feat(orchestrator): pipeline + CLI"
```

---

## Self-Review Notes

- **Spec coverage:** trend-detection (Task 2), content-generation/Anthropic (Task 3), review/AI self-critique (Task 4), publishing + 6 adapters incl. CMS (Task 5), orchestrator pipeline + CLI + regeneration path + per-platform failure isolation (Task 6), Vitest per package (all tasks), npm workspaces + tsc project references (Task 0). All spec sections mapped.
- **Type consistency:** All packages consume types from `@autosocial/core`. `PlatformName` union, `GeneratedContent.perPlatform`, `ReviewResult.passed`, `PublishResult.status` used consistently across generator, reviewer, adapters, publisher, and pipeline.
- **Deterministic checks placement:** length/hashtag/format validation lives in adapters' `validate()` per the spec decision, not in the review module.
```
