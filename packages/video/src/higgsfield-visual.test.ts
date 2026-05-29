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
  it("submits a styled prompt, polls until completed, downloads the image", async () => {
    let postBody: any;
    let postHeaders: Record<string, string> = {};
    const pollStatuses = ["queued", "processing", "completed"];
    let pollCount = 0;
    let downloadedUrl = "";

    const provider = new HiggsfieldVisualProvider({
      apiKey: "hf_test",
      style: "cinematic, dark",
      width: 1024,
      height: 1024,
      pollIntervalMs: 0,
      httpPostJson: async (_url, body, headers) => {
        postBody = body;
        postHeaders = headers;
        return { id: "gen_1", status: "queued" };
      },
      httpGetJson: async () => {
        const status = pollStatuses[Math.min(pollCount++, pollStatuses.length - 1)];
        return status === "completed"
          ? { id: "gen_1", status: "completed", results: [{ url: "https://img.higgsfield.ai/gen_1.png" }] }
          : { id: "gen_1", status };
      },
      download: async (url) => {
        downloadedUrl = url;
        return new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // fake PNG bytes
      },
    });

    const result = await provider.fetch(scene, dir);

    // prompt blends the style preset with the scene narration
    expect(postBody.prompt).toContain("cinematic, dark");
    expect(postBody.prompt).toContain("hunting by sound");
    expect(postBody.task).toBe("text-to-image");
    expect(postBody.width).toBe(1024);
    expect(postHeaders.Authorization).toBe("Bearer hf_test");

    expect(pollCount).toBe(3); // queued, processing, completed
    expect(downloadedUrl).toBe("https://img.higgsfield.ai/gen_1.png");

    expect(result.kind).toBe("ai");
    expect(result.sceneIndex).toBe(1);
    expect(result.path).toBe(join(dir, "scene-1.png"));
    const bytes = await readFile(result.path);
    expect(bytes.length).toBe(4);
  });

  it("throws when the generation fails", async () => {
    const provider = new HiggsfieldVisualProvider({
      apiKey: "hf_test",
      pollIntervalMs: 0,
      httpPostJson: async () => ({ id: "gen_2", status: "queued" }),
      httpGetJson: async () => ({ id: "gen_2", status: "failed", error: "content_policy" }),
      download: async () => new Uint8Array(),
    });
    await expect(provider.fetch(scene, dir)).rejects.toThrow(/higgsfield/i);
  });

  it("throws if polling exceeds maxPolls without completing", async () => {
    const provider = new HiggsfieldVisualProvider({
      apiKey: "hf_test",
      pollIntervalMs: 0,
      maxPolls: 3,
      httpPostJson: async () => ({ id: "gen_3", status: "queued" }),
      httpGetJson: async () => ({ id: "gen_3", status: "processing" }),
      download: async () => new Uint8Array(),
    });
    await expect(provider.fetch(scene, dir)).rejects.toThrow(/timed out|timeout/i);
  });
});
