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
  StoryBible,
  StoryPart,
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

// --- Story mode persistence ---

// Read story/<seriesId>/bible.json. Missing file -> null (caller seeds a new series).
export async function readStoryBible(
  layout: WorkspaceLayout,
  seriesId: string,
): Promise<StoryBible | null> {
  const path = join(layout.storyDir, seriesId, "bible.json");
  if (!existsSync(path)) return null;
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as StoryBible;
}

// Write story/<seriesId>/bible.json (creates parent dirs as needed).
export async function writeStoryBible(
  layout: WorkspaceLayout,
  bible: StoryBible,
): Promise<string> {
  const dir = join(layout.storyDir, bible.seriesId);
  await ensureDir(dir);
  const path = join(dir, "bible.json");
  await writeFile(path, JSON.stringify(bible, null, 2), "utf8");
  return path;
}

// Write one generated part to story/<seriesId>/arcs/<arcId>/partNN.json (awaiting
// approval). NN is the 1-based part number, zero-padded. Returns the written path.
export async function writeStoryPartDraft(
  layout: WorkspaceLayout,
  seriesId: string,
  arcId: string,
  part: StoryPart,
): Promise<string> {
  const dir = join(layout.storyDir, seriesId, "arcs", arcId);
  await ensureDir(dir);
  const num = String(part.index + 1).padStart(2, "0");
  const path = join(dir, `part${num}.json`);
  await writeFile(path, JSON.stringify(part, null, 2), "utf8");
  return path;
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
