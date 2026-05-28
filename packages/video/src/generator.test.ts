import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DefaultVideoGenerator } from "./generator.js";
import { StubTtsProvider, StubVisualProvider, StubRenderer } from "./stub-providers.js";
import type { Renderer, RenderSpec } from "./types.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "autosocial-video-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const script = "AI tools are booming right now.\n\nHere is why it matters for you.";

describe("DefaultVideoGenerator", () => {
  it("produces a vertical + widescreen asset with real files and a duration", async () => {
    const gen = new DefaultVideoGenerator(
      new StubTtsProvider(),
      new StubVisualProvider("stock"),
      new StubRenderer(),
    );
    const asset = await gen.generate({ scriptId: "s1", script, outDir: dir });

    expect(asset.scriptId).toBe("s1");
    expect(existsSync(asset.vertical)).toBe(true);
    expect(existsSync(asset.widescreen)).toBe(true);
    expect(asset.vertical).toContain("9x16");
    expect(asset.widescreen).toContain("16x9");
    expect(asset.durationSec).toBeGreaterThan(0);
    // a voiceover + per-scene visuals were written
    expect(existsSync(join(dir, "voiceover.mp3"))).toBe(true);
    expect(existsSync(join(dir, "scene-0.jpg"))).toBe(true);
    expect(existsSync(join(dir, "scene-1.jpg"))).toBe(true);
  });

  it("times scenes in order against the audio timeline", async () => {
    const specs: RenderSpec[] = [];
    const capturing: Renderer = {
      render: async (spec) => {
        specs.push(spec);
        return spec.outPath;
      },
    };
    const gen = new DefaultVideoGenerator(
      new StubTtsProvider(),
      new StubVisualProvider("ai"),
      capturing,
    );
    await gen.generate({ scriptId: "s1", script, outDir: dir });

    const spec = specs[0];
    expect(spec.timedScenes).toHaveLength(2);
    expect(spec.timedScenes[0].startSec).toBe(0);
    // scene 1 starts after scene 0 ends (sequential, non-overlapping)
    expect(spec.timedScenes[1].startSec).toBeGreaterThanOrEqual(spec.timedScenes[0].endSec);
    // AI visuals were used
    expect(spec.timedScenes[0].visual.kind).toBe("ai");
  });

  it("throws on an empty script", async () => {
    const gen = new DefaultVideoGenerator(
      new StubTtsProvider(),
      new StubVisualProvider(),
      new StubRenderer(),
    );
    await expect(gen.generate({ scriptId: "s1", script: "   ", outDir: dir })).rejects.toThrow(
      /empty script/,
    );
  });
});
