import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  resolveWorkspace,
  readStoryBible,
  type AnthropicClient,
  type StoryBible,
  type WorkspaceLayout,
} from "@autosocial/core";
import { StoryArcGenerator, StoryCritic } from "@autosocial/story";
import { runStoryArc } from "./story-arc.js";

let ws: WorkspaceLayout;
let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "autosocial-story-"));
  ws = resolveWorkspace(dir);
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

function arcJson(): string {
  return JSON.stringify({
    title: "The Long Dark",
    logline: "l",
    parts: [
      {
        title: "First Frost",
        heroScript: "Long one...",
        teaserScript: "Hook one...",
        hook: "h1",
        cliffhanger: "c1",
        platformMeta: { title: "P1", description: "d", hashtags: ["#x"] },
      },
      {
        title: "The Cut Cables",
        heroScript: "Long two...",
        teaserScript: "Hook two...",
        hook: "h2",
        cliffhanger: "c2",
        platformMeta: { title: "P2", description: "d", hashtags: ["#y"] },
      },
    ],
    bibleUpdate: {
      newCharacters: [{ name: "Jonah", description: "saboteur" }],
      newCanon: ["Day 3: cables cut"],
      resolvedThreads: [],
      newThreads: ["Is Mara framed?"],
    },
  });
}

const fakeClient = (json: string): AnthropicClient => ({ complete: async () => json });

function deps(extra: Partial<Parameters<typeof runStoryArc>[0]> = {}) {
  return {
    generator: new StoryArcGenerator(fakeClient(arcJson())),
    critic: new StoryCritic(fakeClient(JSON.stringify({ score: 88, issues: [] }))),
    layout: ws,
    seriesId: "ashfall",
    arcId: "arc1",
    numParts: 2,
    targetMinutes: 4,
    threshold: 75,
    maxRevisions: 2,
    ...extra,
  };
}

describe("runStoryArc", () => {
  it("seeds a new bible, writes part drafts, and advances the bible", async () => {
    const summary = await runStoryArc(
      deps({ seed: { premise: "A solar flare ends the grid.", genre: "post-apocalyptic" } }),
    );
    expect(summary.passed).toBe(true);
    expect(summary.partsWritten).toBe(2);
    expect(summary.partPaths).toHaveLength(2);
    expect(existsSync(summary.partPaths[0])).toBe(true);

    const bible = (await readStoryBible(ws, "ashfall")) as StoryBible;
    expect(bible.arcsCompleted).toBe(1);
    expect(bible.characters.map((c) => c.name)).toContain("Jonah");
  });

  it("uses an existing bible without requiring a seed", async () => {
    const seeded = await runStoryArc(
      deps({ seed: { premise: "p", genre: "g" } }),
    );
    expect(seeded.passed).toBe(true);
    // second arc, no seed -> reads the now-existing bible
    const summary = await runStoryArc(deps({ arcId: "arc2" }));
    expect(summary.partsWritten).toBe(2);
    const bible = (await readStoryBible(ws, "ashfall")) as StoryBible;
    expect(bible.arcsCompleted).toBe(2);
  });

  it("throws when no bible exists and no seed is given", async () => {
    await expect(runStoryArc(deps())).rejects.toThrow("StoryError");
  });
});
