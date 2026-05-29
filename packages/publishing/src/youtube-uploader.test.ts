import { describe, it, expect } from "vitest";
import type { VideoUploadMetadata } from "@autosocial/core";
import { YoutubeVideoUploader, type YoutubeInsertRequest } from "./youtube-uploader.js";

const meta: VideoUploadMetadata = {
  title: "Ashfall Part 1",
  description: "The grid died at dawn.",
  tags: ["apocalypse", "survival"],
  visibility: "private",
};

describe("YoutubeVideoUploader", () => {
  it("inserts the video and returns a published result with the watch URL", async () => {
    let seen: YoutubeInsertRequest | undefined;
    const uploader = new YoutubeVideoUploader(
      async (req) => {
        seen = req;
        return { id: "vid123" };
      },
      () => true, // file exists
    );
    const result = await uploader.upload("/tmp/hero.mp4", meta);

    expect(result.status).toBe("published");
    expect(result.id).toBe("vid123");
    expect(result.url).toBe("https://youtube.com/watch?v=vid123");
    expect(seen).toMatchObject({
      videoPath: "/tmp/hero.mp4",
      title: "Ashfall Part 1",
      tags: ["apocalypse", "survival"],
      privacyStatus: "private",
    });
  });

  it("fails when the video file does not exist (no insert call)", async () => {
    let called = false;
    const uploader = new YoutubeVideoUploader(
      async () => {
        called = true;
        return { id: "x" };
      },
      () => false,
    );
    const result = await uploader.upload("/missing.mp4", meta);
    expect(result.status).toBe("failed");
    expect(result.error).toMatch(/not found/i);
    expect(called).toBe(false);
  });

  it("returns a failed result when the API call throws", async () => {
    const uploader = new YoutubeVideoUploader(
      async () => {
        throw new Error("quotaExceeded");
      },
      () => true,
    );
    const result = await uploader.upload("/tmp/hero.mp4", meta);
    expect(result.status).toBe("failed");
    expect(result.error).toContain("quotaExceeded");
  });
});
