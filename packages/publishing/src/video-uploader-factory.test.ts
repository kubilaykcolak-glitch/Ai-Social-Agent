import { describe, it, expect } from "vitest";
import { createVideoUploader } from "./video-uploader-factory.js";
import { StubVideoUploader } from "./stub-uploader.js";
import { YoutubeVideoUploader } from "./youtube-uploader.js";

describe("createVideoUploader", () => {
  it("returns the stub uploader when YouTube credentials are absent", () => {
    const u = createVideoUploader({ youtubeClientId: "", youtubeClientSecret: "", youtubeRefreshToken: "" });
    expect(u).toBeInstanceOf(StubVideoUploader);
  });

  it("returns the real YouTube uploader when all credentials are present", () => {
    const u = createVideoUploader({
      youtubeClientId: "cid",
      youtubeClientSecret: "secret",
      youtubeRefreshToken: "1//refresh",
    });
    expect(u).toBeInstanceOf(YoutubeVideoUploader);
  });
});
