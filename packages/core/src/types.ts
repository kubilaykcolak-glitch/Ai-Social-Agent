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

// --- Trend radar / filesystem contract ---

// A raw topic candidate as it lands in inbox/topics/*.json (pre-scoring).
export interface RawTopic {
  topic: string;
  source?: string;
  keywords?: string[];
  notes?: string;
}

// A topic after the scorer has ranked it. `finalScore` drives ordering.
export interface ScoredTopic extends Trend {
  viralScore: number; // 0..100
  relevanceScore: number; // 0..100
  finalScore: number; // 0..100, used as Trend.score too
  rationale: string;
  approved: boolean;
}

// Contents of queue/approved-topics.json
export interface ApprovedTopicsFile {
  generatedAt: string; // ISO timestamp
  topics: ScoredTopic[];
}

// A content draft written to drafts/<id>.json and moved through staging.
export interface Draft {
  id: string;
  topic: string;
  platforms: PlatformName[];
  content: GeneratedContent;
  createdAt: string; // ISO timestamp
}

// One row appended to logs/publishing-log.csv
export interface PublishingLogRow {
  timestamp: string; // ISO
  topicId: string;
  topic: string;
  platform: PlatformName;
  status: "published" | "failed";
  postId: string;
  url: string;
  error: string;
}
