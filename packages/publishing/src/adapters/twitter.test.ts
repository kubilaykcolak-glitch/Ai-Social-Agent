import { describe, it, expect } from "vitest";
import type { GeneratedContent } from "@autosocial/core";
import { TwitterAdapter } from "./twitter.js";

function content(body: string): GeneratedContent {
  return {
    brief: { trend: { id: "t", topic: "x", score: 1, source: "s", keywords: [] }, platforms: ["twitter"] },
    perPlatform: [{ platform: "twitter", body, hashtags: ["#ai"] }],
  };
}

describe("TwitterAdapter", () => {
  const adapter = new TwitterAdapter();
  it("ok under 280", () => expect(adapter.validate(content("short")).valid).toBe(true));
  it("rejects over 280", () => {
    expect(adapter.validate(content("x".repeat(300))).valid).toBe(false);
  });
  it("publishes", async () => {
    expect((await adapter.publish(content("hi"))).status).toBe("published");
  });
});
