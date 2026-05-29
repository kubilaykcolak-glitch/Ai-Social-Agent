import type {
  PlatformName,
  PublishResult,
  VideoUploader,
  VideoUploadMetadata,
} from "@autosocial/core";

// No-network uploader used when platform credentials are absent. Mirrors the
// stub-first pattern of the video providers so the publish flow runs without setup.
export class StubVideoUploader implements VideoUploader {
  readonly platform: PlatformName;

  constructor(platform: PlatformName = "youtube") {
    this.platform = platform;
  }

  async upload(_videoPath: string, _meta: VideoUploadMetadata): Promise<PublishResult> {
    const id = `stub_${Date.now()}`;
    return {
      platform: this.platform,
      status: "published",
      id,
      url: `https://example.com/stub/${id}`,
    };
  }
}
