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
