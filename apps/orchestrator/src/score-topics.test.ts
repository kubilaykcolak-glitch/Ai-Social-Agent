import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  resolveWorkspace,
  type RawTopic,
  type ScoredTopic,
  type TrendScorer,
  type WorkspaceLayout,
} from "@autosocial/core";
import { runTopicScoring } from "./score-topics.js";

let dir: string;
let ws: WorkspaceLayout;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "autosocial-score-"));
  ws = resolveWorkspace(dir);
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

function scored(topic: string, finalScore: number, approved: boolean): ScoredTopic {
  return {
    id: topic.toLowerCase().replace(/\s+/g, "-"),
    topic,
    score: finalScore,
    source: "inbox",
    keywords: [],
    viralScore: finalScore,
    relevanceScore: finalScore,
    finalScore,
    rationale: "test",
    approved,
  };
}

describe("runTopicScoring", () => {
  it("reads inbox topics, scores them, and writes only approved to the queue", async () => {
    await mkdir(ws.inboxTopicsDir, { recursive: true });
    const inbox: RawTopic[] = [{ topic: "Good one" }, { topic: "Weak one" }];
    await writeFile(join(ws.inboxTopicsDir, "batch.json"), JSON.stringify(inbox), "utf8");

    let received: RawTopic[] = [];
    const scorer: TrendScorer = {
      score: async (topics) => {
        received = topics;
        return [scored("Good one", 80, true), scored("Weak one", 30, false)];
      },
    };

    const summary = await runTopicScoring({ scorer, layout: ws, limit: 10 });

    expect(received).toHaveLength(2);
    expect(summary.read).toBe(2);
    expect(summary.approved).toBe(1);

    const file = JSON.parse(await readFile(ws.approvedTopicsFile, "utf8"));
    expect(file.topics).toHaveLength(1);
    expect(file.topics[0].topic).toBe("Good one");
  });

  it("writes an empty approved list when the inbox is empty", async () => {
    const scorer: TrendScorer = { score: async () => [] };
    const summary = await runTopicScoring({ scorer, layout: ws, limit: 10 });
    expect(summary.read).toBe(0);
    expect(summary.approved).toBe(0);
    const file = JSON.parse(await readFile(ws.approvedTopicsFile, "utf8"));
    expect(file.topics).toEqual([]);
  });
});
