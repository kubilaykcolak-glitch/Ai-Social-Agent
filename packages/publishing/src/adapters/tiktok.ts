import type {
  GeneratedContent,
  PlatformAdapter,
  PublishResult,
  ValidationResult,
} from "@autosocial/core";

export class TiktokAdapter implements PlatformAdapter {
  readonly name = "tiktok" as const;

  validate(content: GeneratedContent): ValidationResult {
    const errors: string[] = [];
    const c = content.perPlatform.find((p) => p.platform === "tiktok");
    if (!c) errors.push("no tiktok content");
    else {
      if (c.body.length > 2200) errors.push("caption exceeds 2200 chars");
      if (c.hashtags.length > 10) errors.push("too many hashtags (max 10)");
    }
    return { valid: errors.length === 0, errors };
  }

  async publish(content: GeneratedContent): Promise<PublishResult> {
    const v = this.validate(content);
    if (!v.valid) return { platform: this.name, status: "failed", error: v.errors.join("; ") };
    // TODO: real TikTok Content Posting API call here.
    const id = `tt_${Date.now()}`;
    return { platform: this.name, status: "published", id, url: `https://tiktok.com/@me/video/${id}` };
  }
}
