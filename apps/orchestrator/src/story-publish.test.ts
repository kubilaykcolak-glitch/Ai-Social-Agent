import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  resolveWorkspace,
  type PublishResult,
  type StoryPart,
  type VideoUploader,
  type VideoUploadMetadata,
  type WorkspaceLayout,
} from "@autosocial/core";
import { runStoryPublish } from "./story-publish.js";

let ws: WorkspaceLayout;
let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "autosocial-pub-"));
  ws = resolveWorkspace(dir);
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const part: StoryPart = {
  index: 0,
  title: "First Frost",
  heroScript: "...",
  teaserScript: "...",
  hook: "h",
  cliffhanger: "c",
  platformMeta: {
    title: "Ashfall — Part 1",
    description: "The grid died at dawn.",
    hashtags: ["#apocalypse", "#survival"],
  },
};

async function writePart(): Promise<string> {
  const d = join(ws.storyDir, "ashfall", "arcs", "arc1");
  await mkdir(d, { recursive: true });
  const file = join(d, "part01.json");
  await writeFile(file, JSON.stringify(part), "utf8");
  return file;
}

function recordingUploader(
  result: PublishResult,
  seen: { videoPath: string; meta: VideoUploadMetadata }[],
): VideoUploader {
  return {
    platform: "youtube",
    upload: async (videoPath, meta) => {
      seen.push({ videoPath, meta });
      return result;
    },
  };
}

describe("runStoryPublish", () => {
  it("uploads the hero with mapped metadata (hashtags -> bare tags) and logs a published row", async () => {
    const file = await writePart();
    const seen: { videoPath: string; meta: VideoUploadMetadata }[] = [];
    const uploader = recordingUploader(
      { platform: "youtube", status: "published", id: "vidABC", url: "https://youtube.com/watch?v=vidABC" },
      seen,
    );

    const result = await runStoryPublish({
      uploader,
      layout: ws,
      seriesId: "ashfall",
      partFile: file,
      videoPath: "/tmp/hero-16x9.mp4",
      visibility: "private",
    });

    expect(result.status).toBe("published");
    expect(seen).toHaveLength(1);
    expect(seen[0].videoPath).toBe("/tmp/hero-16x9.mp4");
    expect(seen[0].meta.title).toBe("Ashfall — Part 1");
    expect(seen[0].meta.visibility).toBe("private");
    expect(seen[0].meta.tags).toEqual(["apocalypse", "survival"]); // '#' stripped

    const csv = await readFile(ws.publishingLogCsv, "utf8");
    expect(csv).toContain("youtube");
    expect(csv).toContain("vidABC");
  });

  it("logs a failed row when the upload fails", async () => {
    const file = await writePart();
    const seen: { videoPath: string; meta: VideoUploadMetadata }[] = [];
    const uploader = recordingUploader(
      { platform: "youtube", status: "failed", error: "quotaExceeded" },
      seen,
    );

    const result = await runStoryPublish({
      uploader,
      layout: ws,
      seriesId: "ashfall",
      partFile: file,
      videoPath: "/tmp/hero-16x9.mp4",
      visibility: "private",
    });

    expect(result.status).toBe("failed");
    const csv = await readFile(ws.publishingLogCsv, "utf8");
    expect(csv).toContain("failed");
    expect(csv).toContain("quotaExceeded");
  });
});
