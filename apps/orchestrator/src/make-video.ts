import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { VideoAsset, VideoGenerator } from "@autosocial/video";

export interface VideoGenDeps {
  generator: VideoGenerator;
  scriptId: string;
  script: string;
  videosDir: string;
}

// Generate a video from a script into videos/<scriptId>/ and write an asset.json
// manifest alongside the media files. Returns the VideoAsset.
export async function runVideoGeneration(deps: VideoGenDeps): Promise<VideoAsset> {
  const outDir = join(deps.videosDir, deps.scriptId);
  await mkdir(outDir, { recursive: true });
  const asset = await deps.generator.generate({
    scriptId: deps.scriptId,
    script: deps.script,
    outDir,
  });
  await writeFile(join(outDir, "asset.json"), JSON.stringify(asset, null, 2), "utf8");
  return asset;
}
