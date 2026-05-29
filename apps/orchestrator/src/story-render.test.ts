import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveWorkspace, type StoryPart, type WorkspaceLayout } from "@autosocial/core";
import type { VideoAsset, VideoGenerator } from "@autosocial/video";
import { runStoryRender } from "./story-render.js";

let ws: WorkspaceLayout;
let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "autosocial-render-"));
  ws = resolveWorkspace(dir);
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const part: StoryPart = {
  index: 0,
  title: "First Frost",
  heroScript: "The long-form hero narration.",
  teaserScript: "The punchy teaser hook.",
  hook: "h",
  cliffhanger: "c",
  platformMeta: { title: "P1", description: "d", hashtags: ["#x"] },
};

// Records each script it renders; returns a deterministic fake asset.
function fakeGenerator(seen: { scriptId: string; script: string }[]): VideoGenerator {
  return {
    generate: async ({ scriptId, script, outDir }) => {
      seen.push({ scriptId, script });
      const asset: VideoAsset = {
        scriptId,
        vertical: join(outDir, "v.mp4"),
        widescreen: join(outDir, "w.mp4"),
        durationSec: 42,
      };
      return asset;
    },
  };
}

async function writePart(): Promise<string> {
  const partDir = join(ws.storyDir, "ashfall", "arcs", "arc1");
  await mkdir(partDir, { recursive: true });
  const file = join(partDir, "part01.json");
  await writeFile(file, JSON.stringify(part), "utf8");
  return file;
}

describe("runStoryRender", () => {
  it("renders the hero from heroScript and the teaser from teaserScript", async () => {
    const seen: { scriptId: string; script: string }[] = [];
    const file = await writePart();
    const result = await runStoryRender({
      generator: fakeGenerator(seen),
      layout: ws,
      seriesId: "ashfall",
      arcId: "arc1",
      partFile: file,
    });

    expect(seen).toHaveLength(2);
    const hero = seen.find((s) => s.script === part.heroScript);
    const teaser = seen.find((s) => s.script === part.teaserScript);
    expect(hero).toBeDefined();
    expect(teaser).toBeDefined();
    expect(result.hero.durationSec).toBe(42);
    expect(result.teaser.scriptId).toContain("teaser");
  });
});
