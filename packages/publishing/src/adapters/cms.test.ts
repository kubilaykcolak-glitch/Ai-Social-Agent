import { describe, it, expect } from "vitest";
import type { GeneratedContent } from "@autosocial/core";
import { CmsAdapter } from "./cms.js";

function content(body: string): GeneratedContent {
  return {
    brief: { trend: { id: "t", topic: "x", score: 1, source: "s", keywords: [] }, platforms: ["cms"] },
    perPlatform: [{ platform: "cms", body, hashtags: [] }],
  };
}

describe("CmsAdapter", () => {
  const adapter = new CmsAdapter();
  it("rejects empty body", () => expect(adapter.validate(content("  ")).valid).toBe(false));
  it("publishes valid body", async () => {
    expect((await adapter.publish(content("hello"))).status).toBe("published");
  });
});
