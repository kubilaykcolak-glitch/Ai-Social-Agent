import { describe, it, expect } from "vitest";
import type { VideoUploadMetadata } from "@autosocial/core";
import { StubVideoUploader } from "./stub-uploader.js";

const meta: VideoUploadMetadata = {
  title: "Ashfall Part 1",
  description: "d",
  tags: ["apocalypse"],
  visibility: "private",
};

describe("StubVideoUploader", () => {
  it("returns a published result without touching the network or filesystem", async () => {
    const uploader = new StubVideoUploader();
    const result = await uploader.upload("/no/such/file.mp4", meta);
    expect(uploader.platform).toBe("youtube");
    expect(result.status).toBe("published");
    expect(result.id).toBeTruthy();
    expect(result.url).toContain(result.id as string);
  });
});
