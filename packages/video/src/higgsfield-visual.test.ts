import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Scene } from "./types.js";
import { HiggsfieldVisualProvider } from "./higgsfield-visual.js";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "higgs-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const scene: Scene = {
  index: 1,
  narration: "Pale things came up from below, hunting by sound.",
  visualQuery: "pale things below hunting sound",
};

describe("HiggsfieldVisualProvider", () => {
  it("fills the template with the narration, generates, and downloads the image", async () => {
    let seenPrompt = "";
    let downloadedUrl = "";
    const provider = new HiggsfieldVisualProvider({
      credentials: "key:secret",
      template: "cinematic still. {SCENE}. film grain, no text",
      generate: async (prompt) => {
        seenPrompt = prompt;
        return "https://img.higgsfield.ai/gen_1.png";
      },
      download: async (url) => {
        downloadedUrl = url;
        return new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
      },
    });

    const result = await provider.fetch(scene, dir);

    expect(seenPrompt).toContain("cinematic still"); // template wrapper
    expect(seenPrompt).toContain("hunting by sound"); // scene narration in {SCENE}
    expect(seenPrompt).not.toContain("{SCENE}");
    expect(downloadedUrl).toBe("https://img.higgsfield.ai/gen_1.png");
    expect(result.kind).toBe("ai");
    expect(result.sceneIndex).toBe(1);
    expect(result.path).toBe(join(dir, "scene-1.png"));
    const bytes = await readFile(result.path);
    expect(bytes.length).toBe(4);
  });

  it("uses the LLM scene description (not raw narration) when a describer is provided", async () => {
    let seenPrompt = "";
    const provider = new HiggsfieldVisualProvider({
      credentials: "key:secret",
      template: "{SCENE}. cinematic",
      describeScene: async () => "a ruined city skyline under ash-grey sky",
      generate: async (prompt) => {
        seenPrompt = prompt;
        return "https://img.higgsfield.ai/gen_2.png";
      },
      download: async () => new Uint8Array([1, 2, 3]),
    });

    await provider.fetch(scene, dir);
    expect(seenPrompt).toContain("a ruined city skyline under ash-grey sky");
    expect(seenPrompt).not.toContain("hunting by sound"); // narration was replaced
  });

  it("propagates a generation failure", async () => {
    const provider = new HiggsfieldVisualProvider({
      credentials: "key:secret",
      generate: async () => {
        throw new Error("Higgsfield status failed");
      },
      download: async () => new Uint8Array(),
    });
    await expect(provider.fetch(scene, dir)).rejects.toThrow(/higgsfield/i);
  });
});
