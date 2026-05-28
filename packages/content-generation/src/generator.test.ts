import { describe, it, expect } from "vitest";
import type { AnthropicClient, ContentBrief, Trend } from "@autosocial/core";
import { AnthropicContentGenerator } from "./generator.js";

const trend: Trend = { id: "t1", topic: "AI tools", score: 90, source: "stub", keywords: ["ai"] };
const brief: ContentBrief = { trend, platforms: ["instagram", "youtube"] };

function fakeClient(json: string): AnthropicClient {
  return { complete: async () => json };
}

describe("AnthropicContentGenerator", () => {
  it("parses model JSON into per-platform content", async () => {
    const json = JSON.stringify({
      perPlatform: [
        { platform: "instagram", body: "Post body", hashtags: ["#ai"] },
        { platform: "youtube", body: "Script body", hashtags: [] },
      ],
    });
    const gen = new AnthropicContentGenerator(fakeClient(json));
    const result = await gen.generate(brief);
    expect(result.perPlatform).toHaveLength(2);
    expect(result.perPlatform[0].platform).toBe("instagram");
    expect(result.brief.trend.topic).toBe("AI tools");
  });

  it("throws GenerationError on invalid JSON", async () => {
    const gen = new AnthropicContentGenerator(fakeClient("not json"));
    await expect(gen.generate(brief)).rejects.toThrow("GenerationError");
  });
});
