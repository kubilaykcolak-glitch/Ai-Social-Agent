import { DefaultVideoGenerator } from "./generator.js";
import { StubTtsProvider, StubVisualProvider, StubRenderer } from "./stub-providers.js";
import { ElevenLabsTtsProvider } from "./elevenlabs-tts.js";
import { PexelsVisualProvider, type StockQueryDescriber } from "./pexels-visual.js";
import { HiggsfieldVisualProvider, type SceneDescriber } from "./higgsfield-visual.js";
import { FfmpegRenderer } from "./ffmpeg-renderer.js";
import type {
  Renderer,
  TtsProvider,
  VideoGenerator,
  VisualKind,
  VisualProvider,
} from "./types.js";

// Build a fully-stubbed generator (no API keys, no ffmpeg).
export function createStubVideoGenerator(visualKind: VisualKind = "stock"): VideoGenerator {
  return new DefaultVideoGenerator(
    new StubTtsProvider(),
    new StubVisualProvider(visualKind),
    new StubRenderer(),
  );
}

export interface VideoGeneratorConfig {
  visualSource: "stock" | "ai";
  videoRenderer: "ffmpeg" | "stub";
  pexelsApiKey?: string;
  higgsfieldApiKey?: string;
  higgsfieldApiSecret?: string;
  higgsfieldImageModel?: string;
  higgsfieldAspect?: string;
  higgsfieldStyle?: string; // image-prompt template (with optional {SCENE} slot)
  describeScene?: SceneDescriber; // optional LLM scene->visual-prompt rewriter (AI images)
  describeStockQuery?: StockQueryDescriber; // optional LLM scene->stock-search query (Pexels)
  elevenLabsApiKey?: string;
  elevenLabsVoiceId?: string;
  elevenLabsModel?: string;
  ffmpegPath?: string;
}

// Pick real providers where credentials/tools are available, else fall back to
// stubs. Each provider is independent, so partial setups work (e.g. real TTS +
// stub visuals). "ai" uses Higgsfield when a key is present; "stock" uses Pexels;
// otherwise a stub visual provider.
export function createVideoGenerator(cfg: VideoGeneratorConfig): VideoGenerator {
  const tts: TtsProvider = cfg.elevenLabsApiKey
    ? new ElevenLabsTtsProvider({
        apiKey: cfg.elevenLabsApiKey,
        voiceId: cfg.elevenLabsVoiceId ?? "21m00Tcm4TlvDq8ikWAM",
        model: cfg.elevenLabsModel,
      })
    : new StubTtsProvider();

  let visual: VisualProvider;
  if (cfg.visualSource === "ai" && cfg.higgsfieldApiKey && cfg.higgsfieldApiSecret) {
    visual = new HiggsfieldVisualProvider({
      credentials: `${cfg.higgsfieldApiKey}:${cfg.higgsfieldApiSecret}`,
      endpoint: cfg.higgsfieldImageModel,
      aspectRatio: cfg.higgsfieldAspect,
      template: cfg.higgsfieldStyle,
      describeScene: cfg.describeScene,
    });
  } else if (cfg.visualSource === "stock" && cfg.pexelsApiKey) {
    visual = new PexelsVisualProvider({
      apiKey: cfg.pexelsApiKey,
      describeStockQuery: cfg.describeStockQuery,
    });
  } else {
    visual = new StubVisualProvider(cfg.visualSource);
  }

  const renderer: Renderer =
    cfg.videoRenderer === "ffmpeg"
      ? new FfmpegRenderer({ ffmpegPath: cfg.ffmpegPath })
      : new StubRenderer();

  return new DefaultVideoGenerator(tts, visual, renderer);
}
