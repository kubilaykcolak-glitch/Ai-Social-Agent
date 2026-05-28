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

export function tokenize(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

// Stub TTS: no real audio. Writes a placeholder file and fabricates word timings
// at a fixed words-per-second rate so downstream timing logic can be exercised.
export class StubTtsProvider implements TtsProvider {
  async synthesize(text: string, outDir: string): Promise<TtsResult> {
    await mkdir(outDir, { recursive: true });
    const words = tokenize(text);
    const timings: WordTiming[] = words.map((word, i) => ({
      word,
      startSec: i * SECONDS_PER_WORD,
      endSec: (i + 1) * SECONDS_PER_WORD,
    }));
    const audioPath = join(outDir, "voiceover.mp3");
    await writeFile(audioPath, `STUB AUDIO\n${text}`, "utf8");
    return { audioPath, durationSec: words.length * SECONDS_PER_WORD, words: timings };
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
