import { describe, it, expect } from "vitest";
import type { AnthropicClient, StoryArc } from "@autosocial/core";
import { StoryCritic } from "./critic.js";

const arc: StoryArc = {
  arcId: "arc1",
  seriesId: "ashfall",
  title: "The Long Dark",
  logline: "Survivors hunt a saboteur.",
  parts: [
    {
      index: 0,
      title: "First Frost",
      heroScript: "Long...",
      teaserScript: "Hook...",
      hook: "The lights died at noon.",
      cliffhanger: "Someone had cut the cables.",
      platformMeta: { title: "P1", description: "d", hashtags: ["#x"] },
    },
  ],
  bibleUpdate: { newCharacters: [], newCanon: [], resolvedThreads: [], newThreads: [] },
};

function fakeClient(json: string): AnthropicClient {
  return { complete: async () => json };
}

describe("StoryCritic", () => {
  it("passes when score >= threshold", async () => {
    const critic = new StoryCritic(fakeClient(JSON.stringify({ score: 82, issues: [] })));
    const result = await critic.critique(arc, 75);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(82);
  });

  it("fails when score < threshold and keeps issues", async () => {
    const critic = new StoryCritic(
      fakeClient(JSON.stringify({ score: 60, issues: ["weak cliffhanger in part 1"] })),
    );
    const result = await critic.critique(arc, 75);
    expect(result.passed).toBe(false);
    expect(result.issues).toContain("weak cliffhanger in part 1");
  });

  it("throws StoryError on invalid JSON", async () => {
    const critic = new StoryCritic(fakeClient("nope"));
    await expect(critic.critique(arc, 75)).rejects.toThrow("StoryError");
  });

  it("throws StoryError when score is missing", async () => {
    const critic = new StoryCritic(fakeClient(JSON.stringify({ issues: [] })));
    await expect(critic.critique(arc, 75)).rejects.toThrow("StoryError");
  });
});
