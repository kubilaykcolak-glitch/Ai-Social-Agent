import { loadConfig, createLlmClient, resolveWorkspace, consoleLogger } from "@autosocial/core";
import { AnthropicTrendScorer } from "@autosocial/trend-detection";
import { runTopicScoring } from "./score-topics.js";

function parseLimit(argv: string[]): number {
  const flag = argv.find((a) => a.startsWith("--limit="));
  const n = flag ? Number(flag.split("=")[1]) : 10;
  return Number.isFinite(n) && n > 0 ? n : 10;
}

async function main() {
  const cfg = loadConfig();
  const argv = process.argv.slice(2);
  const wsFlag = argv.find((a) => a.startsWith("--workspace="));
  const workspaceDir = wsFlag ? wsFlag.split("=")[1] : cfg.workspaceDir;

  const layout = resolveWorkspace(workspaceDir);
  const client = createLlmClient(cfg);
  const scorer = new AnthropicTrendScorer(client, cfg.topicApprovalThreshold);

  consoleLogger.info("scoring topics", { inbox: layout.inboxTopicsDir, client: cfg.llmClient });
  const summary = await runTopicScoring({ scorer, layout, limit: parseLimit(argv) });
  consoleLogger.info(
    `read ${summary.read} topic(s), approved ${summary.approved} -> ${layout.approvedTopicsFile}`,
  );
}

main().catch((err) => {
  consoleLogger.error("topic scoring failed", err);
  process.exit(1);
});
