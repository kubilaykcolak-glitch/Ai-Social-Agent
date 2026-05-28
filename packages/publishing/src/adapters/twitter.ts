import type {
  GeneratedContent,
  PlatformAdapter,
  PublishResult,
  ValidationResult,
} from "@autosocial/core";

function rendered(body: string, hashtags: string[]): string {
  return [body, hashtags.join(" ")].filter(Boolean).join(" ");
}

export class TwitterAdapter implements PlatformAdapter {
  readonly name = "twitter" as const;

  validate(content: GeneratedContent): ValidationResult {
    const errors: string[] = [];
    const c = content.perPlatform.find((p) => p.platform === "twitter");
    if (!c) errors.push("no twitter content");
    else if (rendered(c.body, c.hashtags).length > 280) {
      errors.push("tweet exceeds 280 chars");
    }
    return { valid: errors.length === 0, errors };
  }

  async publish(content: GeneratedContent): Promise<PublishResult> {
    const v = this.validate(content);
    if (!v.valid) return { platform: this.name, status: "failed", error: v.errors.join("; ") };
    // TODO: real X API v2 tweet call here.
    const id = `tw_${Date.now()}`;
    return { platform: this.name, status: "published", id, url: `https://x.com/i/status/${id}` };
  }
}
