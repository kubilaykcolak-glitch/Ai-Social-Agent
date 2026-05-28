import { readFile } from "node:fs/promises";
import { loadConfig, resolveWorkspace, consoleLogger } from "@autosocial/core";
import { createStubVideoGenerator } from "@autosocial/video";
import { runVideoGeneration } from "./make-video.js";

function argValue(argv: string[], name: string): string | undefined {
  const flag = argv.find((a) => a.startsWith(`--${name}=`));
  return flag ? flag.slice(name.length + 3) : undefined;
}

async function main() {
  const cfg = loadConfig();
  const argv = process.argv.slice(2);

  const scriptFile = argValue(argv, "script-file");
  const scriptArg = argValue(argv, "script");
  const script = scriptFile ? await readFile(scriptFile, "utf8") : scriptArg;
  if (!script) {
    consoleLogger.error("provide a script with --script-file=<path> or --script=\"...\"");
    process.exit(1);
  }

  const scriptId = argValue(argv, "id") ?? `vid_${Date.now()}`;
  const layout = resolveWorkspace(cfg.workspaceDir);
  const generator = createStubVideoGenerator(cfg.visualSource);

  consoleLogger.info("generating video", { scriptId, visualSource: cfg.visualSource });
  const asset = await runVideoGeneration({
    generator,
    scriptId,
    script,
    videosDir: layout.videosDir,
  });

  consoleLogger.info(`duration ~${asset.durationSec}s`);
  consoleLogger.info(`vertical (9:16): ${asset.vertical}`);
  consoleLogger.info(`widescreen (16:9): ${asset.widescreen}`);
}

main().catch((err) => {
  consoleLogger.error("video generation failed", err);
  process.exit(1);
});
