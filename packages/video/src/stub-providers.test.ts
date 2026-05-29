import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { StubTtsProvider } from "./stub-providers.js";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "stub-tts-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("StubTtsProvider", () => {
  it("writes a valid (silent) WAV so the real ffmpeg renderer can consume it", async () => {
    const tts = new StubTtsProvider();
    const result = await tts.synthesize("one two three four", dir);

    expect(result.audioPath.endsWith(".wav")).toBe(true);
    const bytes = await readFile(result.audioPath);
    // RIFF/WAVE header marks it as a real audio container (not a text placeholder).
    expect(bytes.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(bytes.subarray(8, 12).toString("ascii")).toBe("WAVE");
    // 4 words * 0.4s = 1.6s of audio; header is 44 bytes + PCM samples.
    expect(result.durationSec).toBeCloseTo(1.6, 5);
    expect(bytes.length).toBeGreaterThan(44);
    expect(result.words).toHaveLength(4);
  });
});
