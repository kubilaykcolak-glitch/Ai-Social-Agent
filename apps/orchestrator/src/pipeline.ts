import {
  applyMonetization,
  type ContentGenerator,
  type ContentReviewer,
  type GeneratedContent,
  type MonetizationPlan,
  type PlatformName,
  type Publisher,
  type PublishResult,
  type ReviewResult,
  type TrendDetector,
} from "@autosocial/core";

export interface PipelineConfig {
  platforms: PlatformName[];
  threshold: number;
  detector: TrendDetector;
  generator: ContentGenerator;
  reviewer: ContentReviewer;
  publisher: Publisher;
  // Optional: when provided, every generated post gets a monetisation CTA +
  // tracked link appended before review/publish.
  monetization?: MonetizationPlan;
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
  const now = new Date();

  const generateMonetised = async (): Promise<GeneratedContent> => {
    const generated = await cfg.generator.generate(brief);
    if (!cfg.monetization) return generated;
    const postId = `${trend.id}_${now.getTime()}`;
    return applyMonetization(generated, cfg.monetization, { now, postId });
  };

  let content = await generateMonetised();
  let review = await cfg.reviewer.review(content, cfg.threshold);
  let regenerated = false;

  if (!review.passed) {
    regenerated = true;
    content = await generateMonetised();
    review = await cfg.reviewer.review(content, cfg.threshold);
  }

  const published = review.passed
    ? await cfg.publisher.publish(content, cfg.platforms)
    : [];

  return { content, review, regenerated, published };
}
