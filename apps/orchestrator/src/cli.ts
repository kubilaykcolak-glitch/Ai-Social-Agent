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
