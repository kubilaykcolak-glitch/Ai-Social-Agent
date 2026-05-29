import { loadConfig, createLlmClient, resolveWorkspace, consoleLogger } from "@autosocial/core";
import { StoryArcGenerator, StoryCritic } from "@autosocial/story";
import { runStoryArc } from "./story-arc.js";

function argValue(argv: string[], name: string): string | undefined {
  const flag = argv.find((a) => a.startsWith(`--${name}=`));
  return flag ? flag.slice(name.length + 3) : undefined;
}

async function main() {
  const cfg = loadConfig();
  const argv = process.argv.slice(2);

  const seriesId = argValue(argv, "series");
  if (!seriesId) {
    consoleLogger.error('provide --series=<id> (e.g. --series="ashfall")');
    process.exit(1);
  }

  const arcId = argValue(argv, "arc") ?? `arc_${Date.now()}`;
  const numParts = Number(argValue(argv, "parts") ?? "5");
  const targetMinutes = Number(argValue(argv, "minutes") ?? "4");
  const premise = argValue(argv, "premise");
  const genre = argValue(argv, "genre") ?? "post-apocalyptic";
  const workspaceDir = argValue(argv, "workspace") ?? cfg.workspaceDir;

  const layout = resolveWorkspace(workspaceDir);
  const client = createLlmClient(cfg);
  const generator = new StoryArcGenerator(client);
  const critic = new StoryCritic(client);

  consoleLogger.info("generating story arc", {
    seriesId,
    arcId,
    numParts,
    targetMinutes,
    client: cfg.llmClient,
    threshold: cfg.storyScoreThreshold,
  });

  const summary = await runStoryArc({
    generator,
    critic,
    layout,
    seriesId,
    arcId,
    numParts,
    targetMinutes,
    threshold: cfg.storyScoreThreshold,
    maxRevisions: cfg.storyMaxRevisions,
    seed: premise ? { premise, genre } : undefined,
  });

  consoleLogger.info(
    `arc ${summary.arcId}: ${summary.partsWritten} part(s) written, score ${summary.score} ` +
      `(${summary.passed ? "PASSED" : "below threshold"}) after ${summary.attempts} attempt(s)`,
  );
  for (const p of summary.partPaths) consoleLogger.info(`  draft: ${p}`);
  consoleLogger.info(
    "review the drafts, then render approved parts with autosocial-story-render --part-file=<path>",
  );
}

main().catch((err) => {
  consoleLogger.error("story arc generation failed", err);
  process.exit(1);
});
