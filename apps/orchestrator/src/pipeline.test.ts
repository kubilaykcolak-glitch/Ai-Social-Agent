import { describe, it, expect } from "vitest";
import type {
  ContentGenerator,
  ContentReviewer,
  GeneratedContent,
  MonetizationPlan,
  Publisher,
  TrendDetector,
} from "@autosocial/core";
import { runPipeline } from "./pipeline.js";

const trend = { id: "t1", topic: "AI", score: 90, source: "stub", keywords: ["ai"] };

function makeContent(body: string): GeneratedContent {
  return {
    brief: { trend, platforms: ["instagram"] },
    perPlatform: [{ platform: "instagram", body, hashtags: ["#ai"] }],
  };
}

const detector: TrendDetector = { detect: async () => [trend] };

describe("runPipeline", () => {
  it("runs trend -> generate -> review -> publish and returns results", async () => {
    const generator: ContentGenerator = { generate: async () => makeContent("good") };
    const reviewer: ContentReviewer = {
      review: async () => ({ score: 90, issues: [], passed: true }),
    };
    const publisher: Publisher = {
      publish: async (_c, platforms) =>
        platforms.map((p) => ({ platform: p, status: "published" as const, id: "1" })),
    };

    const out = await runPipeline({
      platforms: ["instagram"],
      threshold: 70,
      detector,
      generator,
      reviewer,
      publisher,
    });

    expect(out.review.passed).toBe(true);
    expect(out.published[0].status).toBe("published");
    expect(out.regenerated).toBe(false);
  });

  it("regenerates once when first review fails", async () => {
    let calls = 0;
    const generator: ContentGenerator = {
      generate: async () => makeContent(calls++ === 0 ? "weak" : "strong"),
    };
    const reviewer: ContentReviewer = {
      review: async (c) => {
        const body = c.perPlatform[0].body;
        return body === "strong"
          ? { score: 90, issues: [], passed: true }
          : { score: 40, issues: ["weak"], passed: false };
      },
    };
    const publisher: Publisher = {
      publish: async (_c, platforms) =>
        platforms.map((p) => ({ platform: p, status: "published" as const, id: "1" })),
    };

    const out = await runPipeline({
      platforms: ["instagram"],
      threshold: 70,
      detector,
      generator,
      reviewer,
      publisher,
    });

    expect(out.regenerated).toBe(true);
    expect(out.review.passed).toBe(true);
  });

  it("appends a monetisation CTA + tracked link when a plan is provided", async () => {
    const generator: ContentGenerator = { generate: async () => makeContent("engaging post") };
    let reviewedBody = "";
    const reviewer: ContentReviewer = {
      review: async (c) => {
        reviewedBody = c.perPlatform[0].body;
        return { score: 90, issues: [], passed: true };
      },
    };
    const publisher: Publisher = {
      publish: async (c, platforms) =>
        platforms.map((p) => ({
          platform: p,
          status: "published" as const,
          id: "1",
          url: c.perPlatform[0].body, // surface the body so we can assert on it
        })),
    };
    const monetization: MonetizationPlan = {
      crossPromo: { name: "My YouTube", url: "https://youtube.com/@me" },
      sponsors: [],
    };

    const out = await runPipeline({
      platforms: ["instagram"],
      threshold: 70,
      detector,
      generator,
      reviewer,
      publisher,
      monetization,
    });

    // cross-promo CTA + UTM-tagged link is appended and visible to review + publish
    expect(out.content.perPlatform[0].body).toContain("engaging post");
    expect(out.content.perPlatform[0].body).toContain("utm_source=instagram");
    expect(out.content.perPlatform[0].body).toContain("utm_campaign=crosspromo");
    expect(reviewedBody).toContain("utm_source=instagram");
  });
});
