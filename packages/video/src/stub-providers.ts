import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  Renderer,
  RenderSpec,
  Scene,
  TtsProvider,
  TtsResult,
  VisualKind,
  VisualProvider,
  VisualResult,
  WordTiming,
} from "./types.js";

const SECONDS_PER_WORD = 0.4;
const STUB_SAMPLE_RATE = 8000; // mono 16-bit; low rate keeps the silent file small

export function tokenize(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

// Build a valid PCM WAV of `durationSec` of silence (mono, 16-bit). Dependency-free —
// so the stub TTS produces a real audio container the ffmpeg renderer can ingest,
// enabling a free, watchable preview (real visuals + captions, silent narration).
export function buildSilentWav(durationSec: number, sampleRate = STUB_SAMPLE_RATE): Buffer {
  const numSamples = Math.max(1, Math.round(durationSec * sampleRate));
  const dataSize = numSamples * 2; // 16-bit mono
  const buf = Buffer.alloc(44 + dataSize); // header + silence (already zeroed)
  buf.write("RIFF", 0, "ascii");
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8, "ascii");
  buf.write("fmt ", 12, "ascii");
  buf.writeUInt32LE(16, 16); // fmt chunk size
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32); // block align
  buf.writeUInt16LE(16, 34); // bits per sample
  buf.write("data", 36, "ascii");
  buf.writeUInt32LE(dataSize, 40);
  return buf;
}

// Stub TTS: no real voice, but emits a valid silent WAV (so the real renderer works)
// and fabricates word timings at a fixed rate so caption/timing logic is exercised.
export class StubTtsProvider implements TtsProvider {
  async synthesize(text: string, outDir: string): Promise<TtsResult> {
    await mkdir(outDir, { recursive: true });
    const words = tokenize(text);
    const timings: WordTiming[] = words.map((word, i) => ({
      word,
      startSec: i * SECONDS_PER_WORD,
      endSec: (i + 1) * SECONDS_PER_WORD,
    }));
    const durationSec = words.length * SECONDS_PER_WORD;
    const audioPath = join(outDir, "voiceover.wav");
    await writeFile(audioPath, buildSilentWav(durationSec));
    return { audioPath, durationSec, words: timings };
  }
}

// Stub visual: writes a placeholder asset and echoes which source it represents.
export class StubVisualProvider implements VisualProvider {
  constructor(readonly kind: VisualKind = "stock") {}

  async fetch(scene: Scene, outDir: string): Promise<VisualResult> {
    await mkdir(outDir, { recursive: true });
    const ext = this.kind === "ai" ? "png" : "jpg";
    const path = join(outDir, `scene-${scene.index}.${ext}`);
    await writeFile(path, `STUB ${this.kind.toUpperCase()} VISUAL\n${scene.visualQuery}`, "utf8");
    return { sceneIndex: scene.index, path, kind: this.kind };
  }
}

// Stub renderer: no ffmpeg. Writes a manifest in place of an mp4.
export class StubRenderer implements Renderer {
  async render(spec: RenderSpec): Promise<string> {
    const manifest = {
      aspect: spec.aspect,
      audioPath: spec.audioPath,
      scenes: spec.timedScenes.map((t) => ({
        index: t.scene.index,
        visual: t.visual.path,
        startSec: t.startSec,
        endSec: t.endSec,
      })),
      captionCount: spec.captions.length,
    };
    await writeFile(spec.outPath, `STUB VIDEO\n${JSON.stringify(manifest, null, 2)}`, "utf8");
    return spec.outPath;
  }
}
