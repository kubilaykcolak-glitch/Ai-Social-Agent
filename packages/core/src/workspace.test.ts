import { describe, it, expect } from "vitest";
import { resolve, join } from "node:path";
import { resolveWorkspace } from "./workspace.js";

describe("resolveWorkspace", () => {
  it("derives all contract paths from a root", () => {
    const ws = resolveWorkspace("some/workspace");
    const base = resolve("some/workspace");
    expect(ws.root).toBe(base);
    expect(ws.inboxTopicsDir).toBe(join(base, "inbox", "topics"));
    expect(ws.approvedTopicsFile).toBe(join(base, "queue", "approved-topics.json"));
    expect(ws.draftsDir).toBe(join(base, "drafts"));
    expect(ws.readyToPublishDir).toBe(join(base, "ready-to-publish"));
    expect(ws.needsRevisionDir).toBe(join(base, "needs-revision"));
    expect(ws.publishingLogCsv).toBe(join(base, "logs", "publishing-log.csv"));
    expect(ws.monetizationFile).toBe(join(base, "monetization.json"));
  });
});
