import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  loadConfig,
  resolveWorkspace,
  consoleLogger,
  type VideoVisibility,
} from "@autosocial/core";
import { createVideoUploader } from "@autosocial/publishing";
import { runStoryPublish } from "./story-publish.js";

function argValue(argv: string[], name: string): string | undefined {
  const flag = argv.find((a) => a.startsWith(`--${name}=`));
  return flag ? flag.slice(name.length + 3) : undefined;
}

async function main() {
  const cfg = loadConfig();
  const argv = process.argv.slice(2);

  const seriesId = argValue(argv, "series") ?? "series";
  const arcId = argValue(argv, "arc");
  const part = argValue(argv, "part");
  const workspaceDir = argValue(argv, "workspace") ?? cfg.workspaceDir;
  const layout = resolveWorkspace(workspaceDir);

  // Locate the approved part JSON.
  let partFile = argValue(argv, "part-file");
  if (!partFile) {
    if (!arcId || !part) {
      consoleLogger.error("provide --part-file=<path>, or --series --arc --part=<N>");
      process.exit(1);
    }
    const num = String(Number(part)).padStart(2, "0");
    partFile = join(layout.storyDir, seriesId, "arcs", arcId, `part${num}.json`);
  }

  // Locate the rendered hero video (16:9). Explicit --video wins; else read the
  // hero asset.json written by story-render.
  let videoPath = argValue(argv, "video");
  if (!videoPath) {
    if (!arcId || !part) {
      consoleLogger.error("provide --video=<hero mp4>, or --series --arc --part to locate it");
      process.exit(1);
    }
    const num = String(Number(part)).padStart(2, "0");
    const assetFile = join(
      layout.videosDir,
      seriesId,
      arcId,
      `part${num}`,
      `${arcId}_part${num}_hero`,
      "asset.json",
    );
    const asset = JSON.parse(await readFile(assetFile, "utf8")) as { widescreen: string };
    videoPath = asset.widescreen;
  }

  const visibilityArg = argValue(argv, "visibility");
  const visibility: VideoVisibility =
    visibilityArg === "public" || visibilityArg === "unlisted" || visibilityArg === "private"
      ? visibilityArg
      : cfg.youtubeDefaultVisibility;

  const uploader = createVideoUploader(cfg);
  const real = Boolean(cfg.youtubeRefreshToken);

  consoleLogger.info("publishing story part", {
    partFile,
    videoPath,
    visibility,
    uploader: real ? "youtube" : "stub (no YOUTUBE_* creds)",
  });

  const result = await runStoryPublish({
    uploader,
    layout,
    seriesId,
    partFile,
    videoPath,
    visibility,
  });

  if (result.status === "published") {
    consoleLogger.info(`uploaded (${visibility}): ${result.url}`);
    if (!real) consoleLogger.info("note: stub uploader used — set YOUTUBE_* in .env for a real upload");
  } else {
    consoleLogger.error(`upload failed: ${result.error}`);
    process.exit(1);
  }
}

main().catch((err) => {
  consoleLogger.error("story publish failed", err);
  process.exit(1);
});
