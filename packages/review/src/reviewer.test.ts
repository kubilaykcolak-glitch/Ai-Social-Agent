import { describe, it, expect } from "vitest";
import type { AnthropicClient, GeneratedContent } from "@autosocial/core";
import { AnthropicContentReviewer } from "./reviewer.js";

const content: GeneratedContent = {
  brief: {
    trend: { id: "t1", topic: "AI", score: 90, source: "stub", keywords: ["ai"] },
    platforms: ["instagram"],
  },
  perPlatform: [{ platform: "instagram", body: "Body", hashtags: ["#ai"] }],
};

function fakeClient(json: string): AnthropicClient {
  return { complete: async () => json };
}

describe("AnthropicContentReviewer", () => {
  it("passes when score >= threshold", async () => {
    const json = JSON.stringify({ score: 85, issues: [], suggestedRevision: "" });
    const reviewer = new AnthropicContentReviewer(fakeClient(json));
    const result = await reviewer.review(content, 70);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(85);
  });

  it("fails when score < threshold and keeps issues", async () => {
    const json = JSON.stringify({ score: 50, issues: ["weak hook"], suggestedRevision: "Add a hook" });
    const reviewer = new AnthropicContentReviewer(fakeClient(json));
    const result = await reviewer.review(content, 70);
    expect(result.passed).toBe(false);
    expect(result.issues).toContain("weak hook");
    expect(result.suggestedRevision).toBe("Add a hook");
  });

  it("throws ReviewError on invalid JSON", async () => {
    const reviewer = new AnthropicContentReviewer(fakeClient("nope"));
    await expect(reviewer.review(content, 70)).rejects.toThrow("ReviewError");
  });
});
