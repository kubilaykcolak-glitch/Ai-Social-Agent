import { describe, it, expect } from "vitest";
import type { AnthropicClient, RawTopic } from "@autosocial/core";
import { AnthropicTrendScorer } from "./scorer.js";

function fakeClient(json: string): AnthropicClient {
  return { complete: async () => json };
}

const topics: RawTopic[] = [
  { topic: "AI productivity tools", keywords: ["ai"], source: "rss" },
  { topic: "Quiet quitting", keywords: ["work"] },
];

const modelJson = JSON.stringify({
  scored: [
    { topic: "AI productivity tools", viralScore: 90, relevanceScore: 80, rationale: "hot + on-brand" },
    { topic: "Quiet quitting", viralScore: 40, relevanceScore: 50, rationale: "fading" },
  ],
});

describe("AnthropicTrendScorer", () => {
  it("ranks topics by finalScore desc and flags approval against the threshold", async () => {
    const scorer = new AnthropicTrendScorer(fakeClient(modelJson), 60);
    const result = await scorer.score(topics, 10);

    expect(result).toHaveLength(2);
    expect(result[0].topic).toBe("AI productivity tools");
    expect(result[0].finalScore).toBe(85); // round((90+80)/2)
    expect(result[0].approved).toBe(true);
    expect(result[1].finalScore).toBe(45);
    expect(result[1].approved).toBe(false);
    // breakdown + Trend.score mirror finalScore
    expect(result[0].score).toBe(85);
    expect(result[0].viralScore).toBe(90);
    // keywords carried over from the raw topic
    expect(result[0].keywords).toEqual(["ai"]);
  });

  it("respects the limit (top N after sorting)", async () => {
    const scorer = new AnthropicTrendScorer(fakeClient(modelJson), 60);
    const result = await scorer.score(topics, 1);
    expect(result).toHaveLength(1);
    expect(result[0].topic).toBe("AI productivity tools");
  });

  it("throws on invalid JSON from the model", async () => {
    const scorer = new AnthropicTrendScorer(fakeClient("nonsense"), 60);
    await expect(scorer.score(topics, 10)).rejects.toThrow(/TrendScorer/);
  });
});
