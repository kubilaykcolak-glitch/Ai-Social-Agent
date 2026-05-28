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

// --- Monetisation (ad revenue + sponsorship model) ---

// How a sponsor pays: a flat fee per post, or CPM (per 1000 views).
export interface Payout {
  type: "flat" | "cpm";
  amount: number;
}

// A sponsor campaign with a flight window. While active and matching, its slot
// (talking point + CTA + disclosure + tracked link) is injected into posts.
export interface SponsorCampaign {
  id: string;
  sponsor: string;
  status: "active" | "paused" | "ended";
  start: string; // ISO date (inclusive)
  end: string; // ISO date (inclusive)
  platforms: PlatformName[];
  keywords: string[]; // empty = matches any topic
  talkingPoint: string;
  cta: string;
  url: string; // sponsor destination (UTM params added per post)
  disclosure: string; // e.g. "#ad"
  payout: Payout;
}

// The ad-monetised "hero" content other platforms point traffic to.
export interface CrossPromoTarget {
  name: string;
  url: string; // hero destination (UTM params added per post)
  defaultCta?: string;
  ctaByPlatform?: Partial<Record<PlatformName, string>>;
}

// Contents of workspace/monetization.json
export interface MonetizationPlan {
  crossPromo?: CrossPromoTarget;
  sponsors: SponsorCampaign[];
}

// What to inject into a single platform's post.
export interface MonetizationDirective {
  kind: "sponsor" | "crosspromo";
  campaignId?: string; // set when kind === "sponsor"
  cta: string;
  url: string; // already UTM-tagged
  disclosure?: string; // set for sponsored posts
}
