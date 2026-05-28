import { mkdir, readdir, readFile, writeFile, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import type {
  ApprovedTopicsFile,
  Draft,
  MonetizationPlan,
  PublishingLogRow,
  RawTopic,
  ScoredTopic,
} from "./types.js";
import type { WorkspaceLayout } from "./workspace.js";

async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

// Read every *.json in inbox/topics and flatten into a single RawTopic[].
// Each file may contain a single RawTopic or an array of them. Missing dir -> [].
export async function readInboxTopics(layout: WorkspaceLayout): Promise<RawTopic[]> {
  if (!existsSync(layout.inboxTopicsDir)) return [];
  const files = (await readdir(layout.inboxTopicsDir)).filter((f) => f.endsWith(".json"));
  const all: RawTopic[] = [];
  for (const file of files) {
    const raw = await readFile(join(layout.inboxTopicsDir, file), "utf8");
    const parsed = JSON.parse(raw) as RawTopic | RawTopic[];
    if (Array.isArray(parsed)) all.push(...parsed);
    else all.push(parsed);
  }
  return all;
}

// Read workspace/monetization.json. Missing file -> an empty plan (no sponsors).
export async function readMonetizationPlan(layout: WorkspaceLayout): Promise<MonetizationPlan> {
  if (!existsSync(layout.monetizationFile)) return { sponsors: [] };
  const raw = await readFile(layout.monetizationFile, "utf8");
  const parsed = JSON.parse(raw) as MonetizationPlan;
  return { crossPromo: parsed.crossPromo, sponsors: parsed.sponsors ?? [] };
}

// Write queue/approved-topics.json (creates parent dir as needed).
export async function writeApprovedTopics(
  layout: WorkspaceLayout,
  topics: ScoredTopic[],
): Promise<void> {
  await ensureDir(dirname(layout.approvedTopicsFile));
  const payload: ApprovedTopicsFile = {
    generatedAt: new Date().toISOString(),
    topics,
  };
  await writeFile(layout.approvedTopicsFile, JSON.stringify(payload, null, 2), "utf8");
}

// Write a draft to drafts/<id>.json. Returns the written path.
export async function writeDraft(layout: WorkspaceLayout, draft: Draft): Promise<string> {
  await ensureDir(layout.draftsDir);
  const path = join(layout.draftsDir, `${draft.id}.json`);
  await writeFile(path, JSON.stringify(draft, null, 2), "utf8");
  return path;
}

// Move a draft file from drafts/ into a staging dir. Returns the new path.
export async function moveDraft(
  layout: WorkspaceLayout,
  draftId: string,
  target: "ready" | "needs-revision",
): Promise<string> {
  const src = join(layout.draftsDir, `${draftId}.json`);
  const targetDir = target === "ready" ? layout.readyToPublishDir : layout.needsRevisionDir;
  await ensureDir(targetDir);
  const dest = join(targetDir, basename(src));
  await rename(src, dest);
  return dest;
}

const CSV_HEADER =
  "timestamp,topicId,topic,platform,status,postId,url,error";

function csvField(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function csvRow(row: PublishingLogRow): string {
  return [
    row.timestamp,
    row.topicId,
    row.topic,
    row.platform,
    row.status,
    row.postId,
    row.url,
    row.error,
  ]
    .map((v) => csvField(String(v)))
    .join(",");
}

// Append a row to logs/publishing-log.csv, writing the header first if new.
export async function appendPublishingLog(
  layout: WorkspaceLayout,
  row: PublishingLogRow,
): Promise<void> {
  await ensureDir(dirname(layout.publishingLogCsv));
  const line = csvRow(row);
  if (!existsSync(layout.publishingLogCsv)) {
    await writeFile(layout.publishingLogCsv, `${CSV_HEADER}\n${line}\n`, "utf8");
  } else {
    await writeFile(layout.publishingLogCsv, `${line}\n`, { encoding: "utf8", flag: "a" });
  }
}
