import { describe, it, expect } from "vitest";
import type { GeneratedContent } from "@autosocial/core";
import { YoutubeAdapter } from "./youtube.js";

function content(body: string): GeneratedContent {
  return {
    brief: { trend: { id: "t", topic: "x", score: 1, source: "s", keywords: [] }, platforms: ["youtube"] },
    perPlatform: [{ platform: "youtube", body, hashtags: [] }],
  };
}

describe("YoutubeAdapter", () => {
  const adapter = new YoutubeAdapter();
  it("rejects short script", () => expect(adapter.validate(content("too short")).valid).toBe(false));
  it("accepts a real script", () => {
    expect(adapter.validate(content("x".repeat(60))).valid).toBe(true);
  });
  it("publishes", async () => {
    expect((await adapter.publish(content("x".repeat(60)))).status).toBe("published");
  });
});
