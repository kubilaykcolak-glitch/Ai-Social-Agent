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
