import "./load-env.js";
import { join } from "node:path";
import { loadConfig, createLlmClient, resolveWorkspace, consoleLogger } from "@autosocial/core";
import { createVideoGenerator } from "@autosocial/video";
import { createSceneDescriber } from "./scene-describer.js";
import { createStockQueryDescriber } from "./stock-query-describer.js";
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

  // For AI visuals, rewrite each scene's narration into a tight visual prompt via the LLM.
  // For Pexels stock, rewrite each scene into a stock-search query so visuals match the
  // beat (raw narration keywords return off-topic stock photos otherwise).
  const useAi = cfg.visualSource === "ai" && Boolean(cfg.higgsfieldApiKey && cfg.higgsfieldApiSecret);
  const useStock = cfg.visualSource === "stock" && Boolean(cfg.pexelsApiKey);
  const llm = useAi || useStock ? createLlmClient(cfg) : undefined;
  const describeScene = useAi && llm ? createSceneDescriber(llm) : undefined;
  const describeStockQuery = useStock && llm ? createStockQueryDescriber(llm) : undefined;

  const generator = createVideoGenerator({
    visualSource: cfg.visualSource,
    videoRenderer: cfg.videoRenderer,
    pexelsApiKey: cfg.pexelsApiKey,
    higgsfieldApiKey: cfg.higgsfieldApiKey,
    higgsfieldApiSecret: cfg.higgsfieldApiSecret,
    higgsfieldImageModel: cfg.higgsfieldImageModel,
    higgsfieldAspect: cfg.higgsfieldAspect,
    higgsfieldStyle: cfg.higgsfieldStyle,
    describeScene,
    describeStockQuery,
    elevenLabsApiKey: cfg.elevenLabsApiKey,
    elevenLabsVoiceId: cfg.elevenLabsVoiceId,
    elevenLabsModel: cfg.elevenLabsModel,
  });

  const visuals =
    cfg.visualSource === "ai" && cfg.higgsfieldApiKey && cfg.higgsfieldApiSecret
      ? "higgsfield (ai)"
      : cfg.visualSource === "stock" && cfg.pexelsApiKey
        ? "pexels (stock)"
        : "stub";
  consoleLogger.info("rendering story part", {
    partFile,
    renderer: cfg.videoRenderer,
    tts: cfg.elevenLabsApiKey ? "elevenlabs" : "stub",
    visuals,
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
