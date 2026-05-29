import "./load-env.js";
import { join } from "node:path";
import { loadConfig, resolveWorkspace, consoleLogger } from "@autosocial/core";
import { createVideoGenerator } from "@autosocial/video";
import { runStoryRender } from "./story-render.js";

function argValue(argv: string[], name: string): string | undefined {
  const flag = argv.find((a) => a.startsWith(`--${name}=`));
  return flag ? flag.slice(name.length + 3) : undefined;
}

async function main() {
  const cfg = loadConfig();
  const argv = process.argv.slice(2);

  const seriesId = argValue(argv, "series");
  const arcId = argValue(argv, "arc");
  const workspaceDir = argValue(argv, "workspace") ?? cfg.workspaceDir;
  const layout = resolveWorkspace(workspaceDir);

  // Either point directly at a part file, or build the path from series/arc/part.
  let partFile = argValue(argv, "part-file");
  if (!partFile) {
    const part = argValue(argv, "part");
    if (!seriesId || !arcId || !part) {
      consoleLogger.error(
        "provide --part-file=<path>, or --series=<id> --arc=<id> --part=<N>",
      );
      process.exit(1);
    }
    const num = String(Number(part)).padStart(2, "0");
    partFile = join(layout.storyDir, seriesId, "arcs", arcId, `part${num}.json`);
  }

  const generator = createVideoGenerator({
    visualSource: cfg.visualSource,
    videoRenderer: cfg.videoRenderer,
    pexelsApiKey: cfg.pexelsApiKey,
    elevenLabsApiKey: cfg.elevenLabsApiKey,
    elevenLabsVoiceId: cfg.elevenLabsVoiceId,
    elevenLabsModel: cfg.elevenLabsModel,
  });

  consoleLogger.info("rendering story part", {
    partFile,
    renderer: cfg.videoRenderer,
    tts: cfg.elevenLabsApiKey ? "elevenlabs" : "stub",
  });

  const result = await runStoryRender({
    generator,
    layout,
    seriesId: seriesId ?? "series",
    arcId: arcId ?? "arc",
    partFile,
  });

  consoleLogger.info(`hero (YouTube 16:9): ${result.hero.widescreen}`);
  consoleLogger.info(`hero (9:16): ${result.hero.vertical}`);
  consoleLogger.info(`teaser (9:16): ${result.teaser.vertical}`);
}

main().catch((err) => {
  consoleLogger.error("story render failed", err);
  process.exit(1);
});
