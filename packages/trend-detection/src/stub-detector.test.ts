import { describe, it, expect } from "vitest";
import { StubTrendDetector } from "./stub-detector.js";

describe("StubTrendDetector", () => {
  it("returns up to `limit` trends sorted by score desc", async () => {
    const detector = new StubTrendDetector();
    const trends = await detector.detect(2);
    expect(trends).toHaveLength(2);
    expect(trends[0].score).toBeGreaterThanOrEqual(trends[1].score);
    expect(trends[0]).toHaveProperty("topic");
    expect(trends[0].keywords.length).toBeGreaterThan(0);
  });
});
