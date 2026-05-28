export type AspectRatio = "9:16" | "16:9";
export type VisualKind = "stock" | "ai";

// A unit of the video: a chunk of narration paired with a visual to show.
export interface Scene {
  index: number;
  narration: string;
  visualQuery: string; // keywords/prompt used to fetch or generate the visual
}

export interface WordTiming {
  word: string;
  startSec: number;
  endSec: number;
}

export interface TtsResult {
  audioPath: string;
  durationSec: number;
  words: WordTiming[];
}

export interface VisualResult {
  sceneIndex: number;
  path: string;
  kind: VisualKind;
}

// A scene placed on the timeline with its visual.
export interface TimedScene {
  scene: Scene;
  visual: VisualResult;
  startSec: number;
  endSec: number;
}

export interface RenderSpec {
  aspect: AspectRatio;
  audioPath: string;
  timedScenes: TimedScene[];
  captions: WordTiming[];
  outPath: string;
}

// Final output: one vertical (TikTok/Reels/Shorts) and one widescreen (YouTube) file.
export interface VideoAsset {
  scriptId: string;
  vertical: string; // 9:16 mp4 path
  widescreen: string; // 16:9 mp4 path
  durationSec: number;
}

export interface TtsProvider {
  synthesize(text: string, outDir: string): Promise<TtsResult>;
}

export interface VisualProvider {
  readonly kind: VisualKind;
  fetch(scene: Scene, outDir: string): Promise<VisualResult>;
}

export interface Renderer {
  render(spec: RenderSpec): Promise<string>; // returns the written mp4 path
}

export interface GenerateVideoOpts {
  scriptId: string;
  script: string;
  outDir: string; // directory for this video's assets
}

export interface VideoGenerator {
  generate(opts: GenerateVideoOpts): Promise<VideoAsset>;
}
