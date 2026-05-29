import { describe, it, expect } from "vitest";
import type { AnthropicClient, StoryArcRequest, StoryBible } from "@autosocial/core";
import { StoryArcGenerator } from "./arc-generator.js";
import { StoryCritic } from "./critic.js";
import { generateArc } from "./generate.js";

const bible: StoryBible = {
  seriesId: "ashfall",
  premise: "A solar flare ends the grid.",
  genre: "post-apocalyptic",
  characters: [],
  worldRules: [],
  canon: [],
  openThreads: [],
  arcsCompleted: 0,
};

const request: StoryArcRequest = { arcId: "arc1", numParts: 1, targetMinutes: 4 };

function validArcJson(): string {
  return JSON.stringify({
    title: "The Long Dark",
    logline: "l",
    parts: [
      {
        title: "First Frost",
        heroScript: "Long...",
        teaserScript: "Hook...",
        hook: "The lights died.",
        cliffhanger: "Someone cut the cables.",
        platformMeta: { title: "P1", description: "d", hashtags: ["#x"] },
      },
    ],
    bibleUpdate: { newCharacters: [], newCanon: [], resolvedThreads: [], newThreads: [] },
  });
}

// Returns successive responses; repeats the last once exhausted.
function sequenceClient(
  jsons: string[],
  capture?: (user: string) => void,
): AnthropicClient {
  let i = 0;
  return {
    complete: async (_system: string, user: string) => {
      capture?.(user);
      return jsons[Math.min(i++, jsons.length - 1)];
    },
  };
}

function critiqueJson(score: number, issues: string[] = []): string {
  return JSON.stringify({ score, issues });
}

describe("generateArc revision loop", () => {
  it("returns on the first attempt when the critic passes", async () => {
    const generator = new StoryArcGenerator(sequenceClient([validArcJson()]));
    const critic = new StoryCritic(sequenceClient([critiqueJson(80)]));
    const result = await generateArc({ generator, critic, bible, request, threshold: 75, maxRevisions: 2 });
    expect(result.attempts).toBe(1);
    expect(result.critique.passed).toBe(true);
    expect(result.arc.title).toBe("The Long Dark");
  });

  it("revises then passes, feeding critic issues back into the generator", async () => {
    let lastGenUser = "";
    const generator = new StoryArcGenerator(
      sequenceClient([validArcJson(), validArcJson()], (u) => {
        lastGenUser = u;
      }),
    );
    const critic = new StoryCritic(sequenceClient([critiqueJson(60, ["weak hook"]), critiqueJson(82)]));
    const result = await generateArc({ generator, critic, bible, request, threshold: 75, maxRevisions: 2 });
    expect(result.attempts).toBe(2);
    expect(result.critique.passed).toBe(true);
    expect(lastGenUser).toContain("weak hook"); // issues fed into the revision prompt
  });

  it("exhausts revisions and returns the best-scoring attempt", async () => {
    const generator = new StoryArcGenerator(sequenceClient([validArcJson()]));
    const critic = new StoryCritic(
      sequenceClient([critiqueJson(50), critiqueJson(70), critiqueJson(60)]),
    );
    const result = await generateArc({ generator, critic, bible, request, threshold: 75, maxRevisions: 2 });
    expect(result.attempts).toBe(3); // 1 initial + 2 revisions
    expect(result.critique.passed).toBe(false);
    expect(result.critique.score).toBe(70); // best of 50/70/60
  });
});
