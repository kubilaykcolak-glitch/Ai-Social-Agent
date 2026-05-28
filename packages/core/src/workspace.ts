import { join, resolve } from "node:path";

// Resolves the trend-radar filesystem contract from a single root directory.
// Cowork watches these paths; the orchestrator reads/writes them.
export interface WorkspaceLayout {
  root: string;
  inboxTopicsDir: string; // inbox/topics/  (Cowork drops *.json here)
  approvedTopicsFile: string; // queue/approved-topics.json
  draftsDir: string; // drafts/
  readyToPublishDir: string; // ready-to-publish/
  needsRevisionDir: string; // needs-revision/
  publishingLogCsv: string; // logs/publishing-log.csv
  monetizationFile: string; // monetization.json
  videosDir: string; // videos/  (output: videos/<scriptId>/)
}

export function resolveWorkspace(root: string): WorkspaceLayout {
  const base = resolve(root);
  return {
    root: base,
    inboxTopicsDir: join(base, "inbox", "topics"),
    approvedTopicsFile: join(base, "queue", "approved-topics.json"),
    draftsDir: join(base, "drafts"),
    readyToPublishDir: join(base, "ready-to-publish"),
    needsRevisionDir: join(base, "needs-revision"),
    publishingLogCsv: join(base, "logs", "publishing-log.csv"),
    monetizationFile: join(base, "monetization.json"),
    videosDir: join(base, "videos"),
  };
}
