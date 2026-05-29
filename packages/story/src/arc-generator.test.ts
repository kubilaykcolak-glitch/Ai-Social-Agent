import { describe, it, expect } from "vitest";
import type { AnthropicClient, StoryArcRequest, StoryBible } from "@autosocial/core";
import { StoryArcGenerator } from "./arc-generator.js";

const bible: StoryBible = {
  seriesId: "ashfall",
  premise: "A solar flare ends the grid; survivors shelter in a buried mall.",
  genre: "post-apocalyptic",
  characters: [{ name: "Mara", description: "ex-paramedic, pragmatic leader" }],
  worldRules: ["No electricity above ground"],
  canon: ["Day 1: the flare hit at dawn"],
  openThreads: ["Who sabotaged the water filter?"],
  arcsCompleted: 0,
};

const request: StoryArcRequest = { arcId: "arc1", numParts: 2, targetMinutes: 4 };

function validArcJson(): string {
  return JSON.stringify({
    title: "The Long Dark",
    logline: "Survivors hunt a saboteur as the cold closes in.",
    parts: [
      {
        title: "First Frost",
        heroScript: "Long narration one...",
        teaserScript: "Hook one...",
        hook: "The lights died at noon.",
        cliffhanger: "Someone had cut the cables.",
        platformMeta: { title: "Ashfall P1", description: "d1", hashtags: ["#apocalypse"] },
      },
      {
        title: "The Cut Cables",
        heroScript: "Long narration two...",
        teaserScript: "Hook two...",
        hook: "Mara found the wire.",
        cliffhanger: "It led to her own door.",
        platformMeta: { title: "Ashfall P2", description: "d2", hashtags: ["#survival"] },
      },
    ],
    bibleUpdate: {
      newCharacters: [{ name: "Jonah", description: "the suspected saboteur" }],
      newCanon: ["Day 3: the cables were found cut"],
      resolvedThreads: [],
      newThreads: ["Is Mara being framed?"],
    },
  });
}

function fakeClient(json: string, capture?: (system: string, user: string) => void): AnthropicClient {
  return {
    complete: async (system: string, user: string) => {
      capture?.(system, user);
      return json;
    },
  };
}

describe("StoryArcGenerator", () => {
  it("parses a valid arc, attaches ids and zero-based part indexes", async () => {
    const gen = new StoryArcGenerator(fakeClient(validArcJson()));
    const arc = await gen.generate(bible, request);
    expect(arc.arcId).toBe("arc1");
    expect(arc.seriesId).toBe("ashfall");
    expect(arc.title).toBe("The Long Dark");
    expect(arc.parts).toHaveLength(2);
    expect(arc.parts[0].index).toBe(0);
    expect(arc.parts[1].index).toBe(1);
    expect(arc.bibleUpdate.newCharacters[0].name).toBe("Jonah");
  });

  it("throws StoryError on invalid JSON", async () => {
    const gen = new StoryArcGenerator(fakeClient("not json"));
    await expect(gen.generate(bible, request)).rejects.toThrow("StoryError");
  });

  it("throws StoryError when parts is missing or not an array", async () => {
    const gen = new StoryArcGenerator(fakeClient(JSON.stringify({ title: "x", logline: "y" })));
    await expect(gen.generate(bible, request)).rejects.toThrow("StoryError");
  });

  it("feeds revision notes into the prompt when provided", async () => {
    let seenUser = "";
    const gen = new StoryArcGenerator(
      fakeClient(validArcJson(), (_s, u) => {
        seenUser = u;
      }),
    );
    await gen.generate(bible, { ...request, revisionNotes: ["weak hook in part 1"] });
    expect(seenUser).toContain("weak hook in part 1");
  });
});
