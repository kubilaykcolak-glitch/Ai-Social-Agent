import { describe, it, expect } from "vitest";
import { planScenes } from "./scenes.js";

describe("planScenes", () => {
  it("returns [] for empty input", () => {
    expect(planScenes("   ")).toEqual([]);
  });

  it("splits paragraphs into scenes with sequential indexes", () => {
    const script = "AI tools are booming.\n\nHere is why it matters for you.";
    const scenes = planScenes(script);
    expect(scenes).toHaveLength(2);
    expect(scenes[0].index).toBe(0);
    expect(scenes[1].index).toBe(1);
    expect(scenes[0].narration).toBe("AI tools are booming.");
  });

  it("splits a single block into sentences", () => {
    const scenes = planScenes("First sentence here. Second sentence here! Third?");
    expect(scenes).toHaveLength(3);
    expect(scenes[2].narration).toBe("Third?");
  });

  it("derives a lowercased, punctuation-free visualQuery without stopwords", () => {
    const scenes = planScenes("The AI productivity tools are amazing for you.");
    expect(scenes[0].visualQuery).not.toMatch(/[.!?]/);
    expect(scenes[0].visualQuery).toContain("ai");
    expect(scenes[0].visualQuery).toContain("productivity");
    expect(scenes[0].visualQuery).not.toContain("the");
  });
});
