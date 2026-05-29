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

// Upload an approved, rendered part to the platform and record the outcome in the
// publishing log. Metadata comes from the part's platformMeta.
export async function runStoryPublish(deps: StoryPublishDeps): Promise<PublishResult> {
  const part = JSON.parse(await readFile(deps.partFile, "utf8")) as StoryPart;

  const result = await deps.uploader.upload(deps.videoPath, {
    title: part.platformMeta.title,
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
