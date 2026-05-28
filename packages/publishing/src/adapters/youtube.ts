import type {
  GeneratedContent,
  PlatformAdapter,
  PublishResult,
  ValidationResult,
} from "@autosocial/core";

export class YoutubeAdapter implements PlatformAdapter {
  readonly name = "youtube" as const;

  validate(content: GeneratedContent): ValidationResult {
    const errors: string[] = [];
    const c = content.perPlatform.find((p) => p.platform === "youtube");
    if (!c) errors.push("no youtube content");
    else if (c.body.trim().length < 50) errors.push("script too short (min 50 chars)");
    return { valid: errors.length === 0, errors };
  }

  async publish(content: GeneratedContent): Promise<PublishResult> {
    const v = this.validate(content);
    if (!v.valid) return { platform: this.name, status: "failed", error: v.errors.join("; ") };
    // TODO: persist script / push to YouTube Data API as draft description here.
    const id = `yt_${Date.now()}`;
    return { platform: this.name, status: "published", id, url: `https://youtube.com/watch?v=${id}` };
  }
}
