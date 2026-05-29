import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { StoryPart, WorkspaceLayout } from "@autosocial/core";
import type { VideoAsset, VideoGenerator } from "@autosocial/video";
import { runVideoGeneration } from "./make-video.js";

export interface StoryRenderDeps {
  generator: VideoGenerator;
  layout: WorkspaceLayout;
  seriesId: string;
  arcId: string;
  partFile: string; // path to an approved part JSON
}

export interface StoryRenderResult {
  hero: VideoAsset; // long-form (16:9 widescreen is the YouTube hero)
  teaser: VideoAsset; // short 9:16 cut funneling to the hero
}

// Render an approved story part: the long-form hero from heroScript and the short teaser
// from teaserScript, via the existing video engine. Output lands under
// videos/<seriesId>/<arcId>/partNN/{hero,teaser}/.
export async function runStoryRender(deps: StoryRenderDeps): Promise<StoryRenderResult> {
  const part = JSON.parse(await readFile(deps.partFile, "utf8")) as StoryPart;
  const num = String(part.index + 1).padStart(2, "0");
  const baseDir = join(deps.layout.videosDir, deps.seriesId, deps.arcId, `part${num}`);

  const hero = await runVideoGeneration({
    generator: deps.generator,
    scriptId: `${deps.arcId}_part${num}_hero`,
    script: part.heroScript,
    videosDir: baseDir,
  });

  const teaser = await runVideoGeneration({
    generator: deps.generator,
    scriptId: `${deps.arcId}_part${num}_teaser`,
    script: part.teaserScript,
    videosDir: baseDir,
  });

  return { hero, teaser };
}
