import { DefaultVideoGenerator } from "./generator.js";
import { StubTtsProvider, StubVisualProvider, StubRenderer } from "./stub-providers.js";
import type { VideoGenerator, VisualKind } from "./types.js";

// Build a fully-stubbed generator (no API keys, no ffmpeg). The visual source
// mirrors config.visualSource. Swap individual providers for real ones later.
export function createStubVideoGenerator(visualKind: VisualKind = "stock"): VideoGenerator {
  return new DefaultVideoGenerator(
    new StubTtsProvider(),
    new StubVisualProvider(visualKind),
    new StubRenderer(),
  );
}
