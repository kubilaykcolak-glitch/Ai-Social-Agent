import { writeFile, rename } from "node:fs/promises";
import { execFile } from "node:child_process";
import type { AspectRatio, Renderer, RenderSpec, TimedScene, WordTiming } from "./types.js";

export function dimsFor(aspect: AspectRatio): { w: number; h: number } {
  return aspect === "9:16" ? { w: 1080, h: 1920 } : { w: 1920, h: 1080 };
}

function srtTime(sec: number): string {
  const ms = Math.max(0, Math.round(sec * 1000));
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const millis = ms % 1000;
  const pad = (n: number, l = 2) => String(n).padStart(l, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(millis, 3)}`;
}

// Group word timings into short caption cues and render an SRT document.
export function buildSrt(captions: WordTiming[], wordsPerCue = 4): string {
  const cues: string[] = [];
  let cueIndex = 1;
  for (let i = 0; i < captions.length; i += wordsPerCue) {
    const group = captions.slice(i, i + wordsPerCue);
    const start = group[0].startSec;
    const end = group[group.length - 1].endSec;
    const text = group.map((w) => w.word).join(" ");
    cues.push(`${cueIndex}\n${srtTime(start)} --> ${srtTime(end)}\n${text}\n`);
    cueIndex++;
  }
  return cues.join("\n");
}

// ffmpeg concat-demuxer playlist: each scene's image shown for its duration.
// The last file is repeated (concat demuxer ignores the final entry's duration).
export function buildConcatList(timedScenes: TimedScene[]): string {
  const lines: string[] = [];
  for (const t of timedScenes) {
    const dur = Math.max(0.1, t.endSec - t.startSec);
    const p = t.visual.path.replace(/\\/g, "/");
    lines.push(`file '${p}'`);
    lines.push(`duration ${dur.toFixed(3)}`);
  }
  if (timedScenes.length > 0) {
    const last = timedScenes[timedScenes.length - 1].visual.path.replace(/\\/g, "/");
    lines.push(`file '${last}'`);
  }
  return lines.join("\n") + "\n";
}

// ffmpeg parses ':' inside filter args, so drive-letter colons must be escaped.
function escapeSubtitlesPath(p: string): string {
  return p.replace(/\\/g, "/").replace(/:/g, "\\:");
}

export interface FfmpegArgsInput {
  concatPath: string;
  audioPath: string;
  srtPath: string;
  aspect: AspectRatio;
  outPath: string;
}

export function buildFfmpegArgs(input: FfmpegArgsInput): string[] {
  const { w, h } = dimsFor(input.aspect);
  // The concat demuxer of still images emits one packet per image with PTS spanning
  // its declared duration. `fps=30` on its own does NOT duplicate the still frame
  // forward to fill the gap (filter sees only one input frame). To produce a clean
  // constant-30fps stream we explicitly request CFR output and force a 30fps timebase
  // on the output side, which makes ffmpeg repeat each still frame across its full
  // PTS span. Without this the video stream finishes far before the audio and the
  // last scenes are missing.
  const vf =
    `scale=${w}:${h}:force_original_aspect_ratio=increase,` +
    `crop=${w}:${h},` +
    `subtitles='${escapeSubtitlesPath(input.srtPath)}'`;
  return [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    input.concatPath,
    "-i",
    input.audioPath,
    "-vf",
    vf,
    "-r",
    "30",
    "-fps_mode",
    "cfr",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-shortest",
    input.outPath,
  ];
}

export type FfmpegRunner = (args: string[]) => Promise<void>;

export interface FfmpegRendererOptions {
  ffmpegPath?: string;
  run?: FfmpegRunner;
}

export class FfmpegRenderer implements Renderer {
  private run: FfmpegRunner;

  constructor(opts: FfmpegRendererOptions = {}) {
    const ffmpegPath = opts.ffmpegPath ?? "ffmpeg";
    this.run =
      opts.run ??
      ((args) =>
        new Promise<void>((resolve, reject) => {
          execFile(ffmpegPath, args, (err, _stdout, stderr) => {
            if (err) reject(new Error(`ffmpeg failed: ${stderr || err.message}`));
            else resolve();
          });
        }));
  }

  async render(spec: RenderSpec): Promise<string> {
    const concatPath = `${spec.outPath}.concat.txt`;
    const srtPath = `${spec.outPath}.srt`;
    await writeFile(concatPath, buildConcatList(spec.timedScenes), "utf8");
    await writeFile(srtPath, buildSrt(spec.captions), "utf8");
    const args = buildFfmpegArgs({
      concatPath,
      audioPath: spec.audioPath,
      srtPath,
      aspect: spec.aspect,
      outPath: spec.outPath,
    });
    await this.run(args);
    // Captions are burned into the mp4 already. The sidecar .srt is kept for debugging
    // and upload, but rename it so VLC / YouTube Studio / browsers don't auto-load it
    // and double-render captions on top of the burned-in ones.
    try {
      await rename(srtPath, `${spec.outPath}.captions.txt`);
    } catch {
      // best-effort; not fatal if rename fails on this platform
    }
    return spec.outPath;
  }
}
