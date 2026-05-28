import { join } from "node:path";
import { planScenes } from "./scenes.js";
import { tokenize } from "./stub-providers.js";
import type {
  GenerateVideoOpts,
  Renderer,
  Scene,
  TimedScene,
  TtsProvider,
  TtsResult,
  VideoAsset,
  VideoGenerator,
  VisualProvider,
  VisualResult,
} from "./types.js";

// Map each scene onto the audio timeline using the TTS word timings. Scenes are
// laid out in order; each scene consumes as many words as its narration contains.
function timeScenes(
  scenes: Scene[],
  visuals: VisualResult[],
  tts: TtsResult,
): TimedScene[] {
  const timed: TimedScene[] = [];
  let cursor = 0;
  for (const scene of scenes) {
    const count = tokenize(scene.narration).length;
    const first = tts.words[cursor];
    const last = tts.words[Math.min(cursor + count - 1, tts.words.length - 1)];
    const startSec = first ? first.startSec : 0;
    const endSec = last ? last.endSec : tts.durationSec;
    timed.push({
      scene,
      visual: visuals[scene.index],
      startSec,
      endSec,
    });
    cursor += count;
  }
  return timed;
}

export class DefaultVideoGenerator implements VideoGenerator {
  constructor(
    private tts: TtsProvider,
    private visual: VisualProvider,
    private renderer: Renderer,
  ) {}

  async generate(opts: GenerateVideoOpts): Promise<VideoAsset> {
    const scenes = planScenes(opts.script);
    if (scenes.length === 0) throw new Error("VideoGenerator: empty script");

    const narration = scenes.map((s) => s.narration).join(" ");
    const tts = await this.tts.synthesize(narration, opts.outDir);

    const visuals: VisualResult[] = [];
    for (const scene of scenes) {
      visuals.push(await this.visual.fetch(scene, opts.outDir));
    }

    const timedScenes = timeScenes(scenes, visuals, tts);

    const vertical = await this.renderer.render({
      aspect: "9:16",
      audioPath: tts.audioPath,
      timedScenes,
      captions: tts.words,
      outPath: join(opts.outDir, "video-9x16.mp4"),
    });
    const widescreen = await this.renderer.render({
      aspect: "16:9",
      audioPath: tts.audioPath,
      timedScenes,
      captions: tts.words,
      outPath: join(opts.outDir, "video-16x9.mp4"),
    });

    return {
      scriptId: opts.scriptId,
      vertical,
      widescreen,
      durationSec: tts.durationSec,
    };
  }
}
