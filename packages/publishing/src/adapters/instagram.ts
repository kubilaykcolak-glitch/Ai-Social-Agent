import type {
  GeneratedContent,
  PlatformAdapter,
  PublishResult,
  ValidationResult,
} from "@autosocial/core";

function pick(content: GeneratedContent, name: string) {
  return content.perPlatform.find((p) => p.platform === name);
}

export class InstagramAdapter implements PlatformAdapter {
  readonly name = "instagram" as const;

  validate(content: GeneratedContent): ValidationResult {
    const errors: string[] = [];
    const c = pick(content, "instagram");
    if (!c) errors.push("no instagram content");
    else {
      if (c.body.length > 2200) errors.push("caption exceeds 2200 chars");
      if (c.hashtags.length > 30) errors.push("too many hashtags (max 30)");
    }
    return { valid: errors.length === 0, errors };
  }

  async publish(content: GeneratedContent): Promise<PublishResult> {
    const v = this.validate(content);
    if (!v.valid) {
      return { platform: this.name, status: "failed", error: v.errors.join("; ") };
    }
    // TODO: real Instagram Graph API call here.
    const id = `ig_${Date.now()}`;
    return { platform: this.name, status: "published", id, url: `https://instagram.com/p/${id}` };
  }
}
