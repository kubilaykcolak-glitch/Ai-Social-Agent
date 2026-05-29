import { describe, it, expect } from "vitest";
import type { StoryArc, StoryBible } from "@autosocial/core";
import { updateBible } from "./bible.js";

const bible: StoryBible = {
  seriesId: "ashfall",
  premise: "A solar flare ends the grid.",
  genre: "post-apocalyptic",
  characters: [{ name: "Mara", description: "leader" }],
  worldRules: ["No power above ground"],
  canon: ["Day 1: the flare hit"],
  openThreads: ["Who sabotaged the filter?"],
  arcsCompleted: 0,
};

function arcWith(bibleUpdate: StoryArc["bibleUpdate"]): StoryArc {
  return {
    arcId: "arc1",
    seriesId: "ashfall",
    title: "t",
    logline: "l",
    parts: [],
    bibleUpdate,
  };
}

describe("updateBible", () => {
  it("appends new canon/characters/threads, resolves threads, bumps arcsCompleted", () => {
    const arc = arcWith({
      newCharacters: [{ name: "Jonah", description: "saboteur" }],
      newCanon: ["Day 3: cables found cut"],
      resolvedThreads: ["Who sabotaged the filter?"],
      newThreads: ["Is Mara framed?"],
    });
    const next = updateBible(bible, arc);
    expect(next.arcsCompleted).toBe(1);
    expect(next.characters.map((c) => c.name)).toEqual(["Mara", "Jonah"]);
    expect(next.canon).toEqual(["Day 1: the flare hit", "Day 3: cables found cut"]);
    expect(next.openThreads).toEqual(["Is Mara framed?"]);
  });

  it("does not duplicate a character already in the bible", () => {
    const arc = arcWith({
      newCharacters: [{ name: "Mara", description: "leader (updated)" }],
      newCanon: [],
      resolvedThreads: [],
      newThreads: [],
    });
    const next = updateBible(bible, arc);
    expect(next.characters.filter((c) => c.name === "Mara")).toHaveLength(1);
  });

  it("does not mutate the input bible", () => {
    const arc = arcWith({
      newCharacters: [],
      newCanon: ["x"],
      resolvedThreads: [],
      newThreads: [],
    });
    updateBible(bible, arc);
    expect(bible.canon).toEqual(["Day 1: the flare hit"]);
    expect(bible.arcsCompleted).toBe(0);
  });
});
