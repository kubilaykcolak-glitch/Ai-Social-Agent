import { DefaultVideoGenerator } from "./generator.js";
import { StubTtsProvider, StubVisualProvider, StubRenderer } from "./stub-providers.js";
import { ElevenLabsTtsProvider } from "./elevenlabs-tts.js";
import { PexelsVisualProvider } from "./pexels-visual.js";
import { HiggsfieldVisualProvider } from "./higgsfield-visual.js";
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
  higgsfieldImageModel?: string;
  higgsfieldStyle?: string;
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
  if (cfg.visualSource === "ai" && cfg.higgsfieldApiKey) {
    visual = new HiggsfieldVisualProvider({
      apiKey: cfg.higgsfieldApiKey,
      model: cfg.higgsfieldImageModel,
      style: cfg.higgsfieldStyle,
    });
  } else if (cfg.visualSource === "stock" && cfg.pexelsApiKey) {
    visual = new PexelsVisualProvider({ apiKey: cfg.pexelsApiKey });
  } else {
    visual = new StubVisualProvider(cfg.visualSource);
  }

  const renderer: Renderer =
    cfg.videoRenderer === "ffmpeg"
      ? new FfmpegRenderer({ ffmpegPath: cfg.ffmpegPath })
      : new StubRenderer();

  return new DefaultVideoGenerator(tts, visual, renderer);
}
