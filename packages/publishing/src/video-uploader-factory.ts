import { createReadStream } from "node:fs";
import { google } from "googleapis";
import type { VideoUploader } from "@autosocial/core";
import { StubVideoUploader } from "./stub-uploader.js";
import { YoutubeVideoUploader, type YoutubeInsertFn } from "./youtube-uploader.js";

export interface VideoUploaderConfig {
  youtubeClientId: string;
  youtubeClientSecret: string;
  youtubeRefreshToken: string;
}

// Build the real googleapis-backed insert function from OAuth2 credentials.
function makeYoutubeInsert(cfg: VideoUploaderConfig): YoutubeInsertFn {
  return async (req) => {
    const oauth2 = new google.auth.OAuth2(cfg.youtubeClientId, cfg.youtubeClientSecret);
    oauth2.setCredentials({ refresh_token: cfg.youtubeRefreshToken });
    const youtube = google.youtube({ version: "v3", auth: oauth2 });
    const res = await youtube.videos.insert({
      part: ["snippet", "status"],
      requestBody: {
        snippet: { title: req.title, description: req.description, tags: req.tags },
        status: { privacyStatus: req.privacyStatus },
      },
      media: { body: createReadStream(req.videoPath) },
    });
    const id = res.data.id;
    if (!id) throw new Error("YouTube videos.insert returned no video id");
    return { id };
  };
}

// Pick the real YouTube uploader when credentials are present, else the stub.
export function createVideoUploader(cfg: VideoUploaderConfig): VideoUploader {
  if (cfg.youtubeClientId && cfg.youtubeClientSecret && cfg.youtubeRefreshToken) {
    return new YoutubeVideoUploader(makeYoutubeInsert(cfg));
  }
  return new StubVideoUploader("youtube");
}
