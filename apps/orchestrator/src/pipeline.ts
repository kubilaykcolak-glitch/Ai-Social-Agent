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
