import { describe, it, expect } from "vitest";
import type { GeneratedContent } from "@autosocial/core";
import { TiktokAdapter } from "./tiktok.js";

function content(hashtags: string[]): GeneratedContent {
  return {
    brief: { trend: { id: "t", topic: "x", score: 1, source: "s", keywords: [] }, platforms: ["tiktok"] },
    perPlatform: [{ platform: "tiktok", body: "hi", hashtags }],
  };
}

describe("TiktokAdapter", () => {
  const adapter = new TiktokAdapter();
  it("ok within limits", () => expect(adapter.validate(content(["#a"])).valid).toBe(true));
  it("rejects > 10 hashtags", () => {
    const tags = Array.from({ length: 11 }, (_, i) => `#t${i}`);
    expect(adapter.validate(content(tags)).valid).toBe(false);
  });
  it("publishes", async () => {
    expect((await adapter.publish(content(["#a"]))).status).toBe("published");
  });
});
