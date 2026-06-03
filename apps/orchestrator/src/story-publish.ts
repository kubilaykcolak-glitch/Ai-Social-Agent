import { readFile } from "node:fs/promises";
import {
  appendPublishingLog,
  type PublishResult,
  type StoryPart,
  type VideoUploader,
  type VideoVisibility,
  type WorkspaceLayout,
} from "@autosocial/core";

export interface StoryPublishDeps {
  uploader: VideoUploader;
  layout: WorkspaceLayout;
  seriesId: string;
  partFile: string; // approved part JSON (metadata source)
  videoPath: string; // the rendered hero file to upload (16:9 for YouTube)
  visibility: VideoVisibility;
}

// Strip a leading '#' so caption hashtags become valid platform tags.
function toTags(hashtags: string[]): string[] {
  return hashtags.map((h) => h.replace(/^#/, "")).filter(Boolean);
}

// Prefix the platform title with a binge-friendly part marker. `part.index` is
// 0-based on disk; viewers see 1-based. YouTube enforces a 100-char title limit
// so we trim the underlying title to make room for the prefix.
function buildPlatformTitle(part: StoryPart): string {
  const prefix = `Part ${part.index + 1} — `;
  const base = part.platformMeta.title;
  // Skip the prefix if the title already contains a "Part N" marker anywhere
  // (e.g. "Ashfall — Part 1" or "Part 1 — ..."). Keeps the function idempotent.
  if (/\bpart\s+\d+\b/i.test(base)) return base;
  const room = 100 - prefix.length;
  const trimmed = base.length > room ? `${base.slice(0, room - 1).trimEnd()}…` : base;
  return `${prefix}${trimmed}`;
}

// Upload an approved, rendered part to the platform and record the outcome in the
// publishing log. Metadata comes from the part's platformMeta.
export async function runStoryPublish(deps: StoryPublishDeps): Promise<PublishResult> {
  const part = JSON.parse(await readFile(deps.partFile, "utf8")) as StoryPart;

  const result = await deps.uploader.upload(deps.videoPath, {
    title: buildPlatformTitle(part),
    description: part.platformMeta.description,
    tags: toTags(part.platformMeta.hashtags),
    visibility: deps.visibility,
  });

  await appendPublishingLog(deps.layout, {
    timestamp: new Date().toISOString(),
    topicId: deps.seriesId,
    topic: part.title,
    platform: deps.uploader.platform,
    status: result.status,
    postId: result.id ?? "",
    url: result.url ?? "",
    error: result.error ?? "",
  });

  return result;
}
