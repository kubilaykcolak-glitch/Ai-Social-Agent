import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveWorkspace, type WorkspaceLayout } from "./workspace.js";
import {
  readInboxTopics,
  writeApprovedTopics,
  writeDraft,
  moveDraft,
  appendPublishingLog,
  readMonetizationPlan,
} from "./fs-store.js";
import type { Draft, PublishingLogRow, ScoredTopic } from "./types.js";

let ws: WorkspaceLayout;
let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "autosocial-"));
  ws = resolveWorkspace(dir);
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const scored: ScoredTopic = {
  id: "t1",
  topic: "AI tools",
  score: 88,
  source: "inbox",
  keywords: ["ai"],
  viralScore: 90,
  relevanceScore: 86,
  finalScore: 88,
  rationale: "trending, on-brand",
  approved: true,
};

describe("readInboxTopics", () => {
  it("returns [] when the inbox does not exist", async () => {
    expect(await readInboxTopics(ws)).toEqual([]);
  });

  it("flattens single objects and arrays across files", async () => {
    await mkdir(ws.inboxTopicsDir, { recursive: true });
    await writeFile(join(ws.inboxTopicsDir, "a.json"), JSON.stringify({ topic: "one" }), "utf8");
    await writeFile(
      join(ws.inboxTopicsDir, "b.json"),
      JSON.stringify([{ topic: "two" }, { topic: "three" }]),
      "utf8",
    );
    const topics = await readInboxTopics(ws);
    expect(topics.map((t) => t.topic).sort()).toEqual(["one", "three", "two"]);
  });
});

describe("writeApprovedTopics", () => {
  it("writes a timestamped file with the topics", async () => {
    await writeApprovedTopics(ws, [scored]);
    const parsed = JSON.parse(await readFile(ws.approvedTopicsFile, "utf8"));
    expect(parsed.topics).toHaveLength(1);
    expect(parsed.topics[0].topic).toBe("AI tools");
    expect(typeof parsed.generatedAt).toBe("string");
  });
});

describe("writeDraft + moveDraft", () => {
  const draft: Draft = {
    id: "d1",
    topic: "AI tools",
    platforms: ["instagram"],
    content: {
      brief: { trend: scored, platforms: ["instagram"] },
      perPlatform: [{ platform: "instagram", body: "hi", hashtags: ["#ai"] }],
    },
    createdAt: new Date().toISOString(),
  };

  it("writes a draft then moves it to ready-to-publish", async () => {
    const written = await writeDraft(ws, draft);
    expect(existsSync(written)).toBe(true);
    const dest = await moveDraft(ws, "d1", "ready");
    expect(existsSync(written)).toBe(false);
    expect(dest.startsWith(ws.readyToPublishDir)).toBe(true);
    expect(existsSync(dest)).toBe(true);
  });

  it("moves a draft to needs-revision", async () => {
    await writeDraft(ws, draft);
    const dest = await moveDraft(ws, "d1", "needs-revision");
    expect(dest.startsWith(ws.needsRevisionDir)).toBe(true);
    expect(existsSync(dest)).toBe(true);
  });
});

describe("readMonetizationPlan", () => {
  it("returns an empty plan when the file is missing", async () => {
    expect(await readMonetizationPlan(ws)).toEqual({ sponsors: [] });
  });

  it("reads crossPromo and sponsors when present", async () => {
    await writeFile(
      ws.monetizationFile,
      JSON.stringify({
        crossPromo: { name: "YT", url: "https://youtube.com/@me" },
        sponsors: [{ id: "s1" }],
      }),
      "utf8",
    );
    const plan = await readMonetizationPlan(ws);
    expect(plan.crossPromo?.name).toBe("YT");
    expect(plan.sponsors).toHaveLength(1);
  });
});

describe("appendPublishingLog", () => {
  const row: PublishingLogRow = {
    timestamp: "2026-05-28T00:00:00.000Z",
    topicId: "t1",
    topic: "AI tools",
    platform: "instagram",
    status: "published",
    postId: "ig_1",
    url: "https://instagram.com/p/ig_1",
    error: "",
  };

  it("writes a header on first append, then appends rows", async () => {
    await appendPublishingLog(ws, row);
    await appendPublishingLog(ws, { ...row, postId: "ig_2", topic: "with, comma" });
    const csv = await readFile(ws.publishingLogCsv, "utf8");
    const lines = csv.trim().split("\n");
    expect(lines[0]).toBe("timestamp,topicId,topic,platform,status,postId,url,error");
    expect(lines).toHaveLength(3);
    expect(lines[2]).toContain('"with, comma"'); // comma field is quoted
  });
});
