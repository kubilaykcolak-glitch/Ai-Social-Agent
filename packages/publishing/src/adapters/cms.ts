import type {
  GeneratedContent,
  PlatformAdapter,
  PublishResult,
  ValidationResult,
} from "@autosocial/core";

export class CmsAdapter implements PlatformAdapter {
  readonly name = "cms" as const;
  constructor(private endpoint = "https://cms.example.com/api/posts") {}

  validate(content: GeneratedContent): ValidationResult {
    const errors: string[] = [];
    const c = content.perPlatform.find((p) => p.platform === "cms");
    if (!c) errors.push("no cms content");
    else if (c.body.trim().length === 0) errors.push("body is empty");
    return { valid: errors.length === 0, errors };
  }

  async publish(content: GeneratedContent): Promise<PublishResult> {
    const v = this.validate(content);
    if (!v.valid) return { platform: this.name, status: "failed", error: v.errors.join("; ") };
    // TODO: POST to headless CMS REST endpoint (this.endpoint) here.
    const id = `cms_${Date.now()}`;
    return { platform: this.name, status: "published", id, url: `${this.endpoint}/${id}` };
  }
}
