import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildSrt,
  buildConcatList,
  buildFfmpegArgs,
  dimsFor,
  FfmpegRenderer,
} from "./ffmpeg-renderer.js";
import type { RenderSpec, TimedScene, WordTiming } from "./types.js";

const captions: WordTiming[] = [
  { word: "AI", startSec: 0, endSec: 0.4 },
  { word: "tools", startSec: 0.4, endSec: 0.8 },
  { word: "are", startSec: 0.8, endSec: 1.2 },
  { word: "booming", startSec: 1.2, endSec: 1.6 },
  { word: "now", startSec: 1.6, endSec: 2.0 },
];

const timedScenes: TimedScene[] = [
  {
    scene: { index: 0, narration: "AI tools are booming now", visualQuery: "ai tools" },
    visual: { sceneIndex: 0, path: "C:\\tmp\\scene-0.jpg", kind: "stock" },
    startSec: 0,
    endSec: 2.0,
  },
];

describe("dimsFor", () => {
  it("maps aspect ratios to dimensions", () => {
    expect(dimsFor("9:16")).toEqual({ w: 1080, h: 1920 });
    expect(dimsFor("16:9")).toEqual({ w: 1920, h: 1080 });
  });
});

describe("buildSrt", () => {
  it("groups words into cues with SRT timestamps", () => {
    const srt = buildSrt(captions, 4);
    expect(srt).toContain("00:00:00,000 --> 00:00:01,600");
    expect(srt).toContain("AI tools are booming");
    expect(srt).toContain("2\n"); // second cue index
    expect(srt).toContain("now");
  });
});

describe("buildConcatList", () => {
  it("emits file + duration lines and repeats the last file (forward slashes)", () => {
    const list = buildConcatList(timedScenes);
    expect(list).toContain("file 'C:/tmp/scene-0.jpg'");
    expect(list).toContain("duration 2.000");
    // last file repeated for the concat demuxer
    expect(list.match(/file '/g)).toHaveLength(2);
  });
});

describe("buildFfmpegArgs", () => {
  it("includes concat input, scale/crop, escaped subtitles, and output", () => {
    const args = buildFfmpegArgs({
      concatPath: "list.txt",
      audioPath: "voice.mp3",
      srtPath: "C:\\tmp\\caps.srt",
      aspect: "9:16",
      outPath: "out.mp4",
    });
    expect(args).toContain("concat");
    expect(args).toContain("out.mp4");
    const vf = args[args.indexOf("-vf") + 1];
    expect(vf).toContain("fps=30");
    expect(vf).toContain("scale=1080:1920");
    expect(vf).toContain("crop=1080:1920");
    expect(vf).toContain("subtitles='C\\:/tmp/caps.srt'");
  });
});

describe("FfmpegRenderer.render", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "ffr-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("writes the concat + srt sidecars and invokes the runner with the args", async () => {
    let ranArgs: string[] = [];
    const renderer = new FfmpegRenderer({
      run: async (args) => {
        ranArgs = args;
      },
    });
    const outPath = join(dir, "out.mp4");
    const spec: RenderSpec = {
      aspect: "9:16",
      audioPath: join(dir, "voice.mp3"),
      timedScenes,
      captions,
      outPath,
    };
    const result = await renderer.render(spec);

    expect(result).toBe(outPath);
    expect(existsSync(`${outPath}.concat.txt`)).toBe(true);
    expect(existsSync(`${outPath}.srt`)).toBe(true);
    expect(ranArgs).toContain(outPath);
    const srt = await readFile(`${outPath}.srt`, "utf8");
    expect(srt).toContain("AI tools are booming");
  });
});
