import { existsSync } from "node:fs";
import type {
  PublishResult,
  VideoUploader,
  VideoUploadMetadata,
} from "@autosocial/core";

// The shape passed to the injected insert function (the real one streams the file to
// the YouTube Data API videos.insert endpoint; tests inject a fake).
export interface YoutubeInsertRequest {
  videoPath: string;
  title: string;
  description: string;
  tags: string[];
  privacyStatus: VideoUploadMetadata["visibility"];
}

export type YoutubeInsertFn = (req: YoutubeInsertRequest) => Promise<{ id: string }>;

// Uploads a rendered video to YouTube. The actual API/SDK call is injected so the
// mapping + result/error shaping is unit-testable without network or credentials.
export class YoutubeVideoUploader implements VideoUploader {
  readonly platform = "youtube" as const;

  constructor(
    private insert: YoutubeInsertFn,
    private fileExists: (path: string) => boolean = existsSync,
  ) {}

  async upload(videoPath: string, meta: VideoUploadMetadata): Promise<PublishResult> {
    if (!this.fileExists(videoPath)) {
      return { platform: this.platform, status: "failed", error: `video file not found: ${videoPath}` };
    }
    try {
      const { id } = await this.insert({
        videoPath,
        title: meta.title,
        description: meta.description,
        tags: meta.tags,
        privacyStatus: meta.visibility,
      });
      return {
        platform: this.platform,
        status: "published",
        id,
        url: `https://youtube.com/watch?v=${id}`,
      };
    } catch (err) {
      return {
        platform: this.platform,
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
