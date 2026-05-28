import { describe, it, expect } from "vitest";
import type { GeneratedContent } from "@autosocial/core";
import { InstagramAdapter } from "./instagram.js";

function content(body: string, hashtags: string[]): GeneratedContent {
  return {
    brief: { trend: { id: "t", topic: "x", score: 1, source: "s", keywords: [] }, platforms: ["instagram"] },
    perPlatform: [{ platform: "instagram", body, hashtags }],
  };
}

describe("InstagramAdapter", () => {
  const adapter = new InstagramAdapter();

  it("validates ok within limits", () => {
    expect(adapter.validate(content("hi", ["#a"])).valid).toBe(true);
  });

  it("rejects too many hashtags", () => {
    const tags = Array.from({ length: 31 }, (_, i) => `#t${i}`);
    const r = adapter.validate(content("hi", tags));
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/hashtag/i);
  });

  it("publishes a result with id and url", async () => {
    const r = await adapter.publish(content("hi", ["#a"]));
    expect(r.status).toBe("published");
    expect(r.platform).toBe("instagram");
    expect(r.id).toBeTruthy();
    expect(r.url).toBeTruthy();
  });
});
