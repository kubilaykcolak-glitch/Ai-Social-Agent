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

// --- Story mode (serialized AI fiction) ---

// A recurring character in the ongoing saga.
export interface StoryCharacter {
  name: string;
  description: string;
}

// Persistent series memory at story/<seriesId>/bible.json. Carries continuity
// (characters, world rules, what has happened, unresolved threads) across arcs so
// each new arc continues the saga consistently.
export interface StoryBible {
  seriesId: string;
  premise: string;
  genre: string;
  characters: StoryCharacter[];
  worldRules: string[];
  canon: string[]; // events that have happened, chronological
  openThreads: string[]; // unresolved hooks to pay off in later arcs
  arcsCompleted: number;
}

// Per-part platform metadata (titles/descriptions/hashtags for the upload).
export interface StoryPartMeta {
  title: string;
  description: string;
  hashtags: string[];
}

// One released part: a long-form narration (the 16:9 YouTube hero) plus a short
// 9:16 teaser script that hooks + ends on a cliffhanger + points to the hero.
export interface StoryPart {
  index: number;
  title: string;
  heroScript: string;
  teaserScript: string;
  hook: string;
  cliffhanger: string;
  platformMeta: StoryPartMeta;
}

// New canon an arc contributes, applied to the bible after the arc is generated.
export interface BibleUpdate {
  newCharacters: StoryCharacter[];
  newCanon: string[];
  resolvedThreads: string[];
  newThreads: string[];
}

// A complete, coherent multi-part story arc generated as a whole, then sliced into
// cliffhanger parts. `bibleUpdate` feeds saga continuity.
export interface StoryArc {
  arcId: string;
  seriesId: string;
  title: string;
  logline: string;
  parts: StoryPart[];
  bibleUpdate: BibleUpdate;
}

// What to generate: how many parts and the per-part hero length target.
export interface StoryArcRequest {
  arcId: string;
  numParts: number;
  targetMinutes: number;
  revisionNotes?: string[]; // critic issues fed back on a revision pass
}

// The critic's verdict on a generated arc, against the story-craft rubric.
export interface StoryCritique {
  score: number; // 0..100
  issues: string[];
  passed: boolean;
}
