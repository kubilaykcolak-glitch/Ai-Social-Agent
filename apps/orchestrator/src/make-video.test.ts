import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { VideoAsset, VideoGenerator } from "@autosocial/video";
import { runVideoGeneration } from "./make-video.js";

let videosDir: string;

beforeEach(async () => {
  videosDir = await mkdtemp(join(tmpdir(), "autosocial-mv-"));
});
afterEach(async () => {
  await rm(videosDir, { recursive: true, force: true });
});

describe("runVideoGeneration", () => {
  it("creates videos/<scriptId>, runs the generator, and writes asset.json", async () => {
    let receivedOutDir = "";
    const generator: VideoGenerator = {
      generate: async (opts) => {
        receivedOutDir = opts.outDir;
        const asset: VideoAsset = {
          scriptId: opts.scriptId,
          vertical: join(opts.outDir, "video-9x16.mp4"),
          widescreen: join(opts.outDir, "video-16x9.mp4"),
          durationSec: 12,
        };
        return asset;
      },
    };

    const asset = await runVideoGeneration({
      generator,
      scriptId: "vid_1",
      script: "Some script.",
      videosDir,
    });

    expect(receivedOutDir).toBe(join(videosDir, "vid_1"));
    expect(asset.durationSec).toBe(12);
    const manifestPath = join(videosDir, "vid_1", "asset.json");
    expect(existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    expect(manifest.scriptId).toBe("vid_1");
  });
});
