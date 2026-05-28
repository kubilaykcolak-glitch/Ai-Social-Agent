import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { charsToWords, ElevenLabsTtsProvider, type HttpPostJson } from "./elevenlabs-tts.js";

describe("charsToWords", () => {
  it("groups characters into words by whitespace with correct timings", () => {
    // "Hi yo"
    const chars = ["H", "i", " ", "y", "o"];
    const starts = [0, 0.1, 0.2, 0.3, 0.4];
    const ends = [0.1, 0.2, 0.3, 0.4, 0.5];
    const words = charsToWords(chars, starts, ends);
    expect(words).toEqual([
      { word: "Hi", startSec: 0, endSec: 0.2 },
      { word: "yo", startSec: 0.3, endSec: 0.5 },
    ]);
  });

  it("handles trailing text with no final space", () => {
    const words = charsToWords(["a"], [1], [2]);
    expect(words).toEqual([{ word: "a", startSec: 1, endSec: 2 }]);
  });
});

describe("ElevenLabsTtsProvider", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "el-tts-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("calls the with-timestamps endpoint, writes audio, and returns word timings", async () => {
    let calledUrl = "";
    let calledHeaders: Record<string, string> = {};
    const http: HttpPostJson = async (url, headers) => {
      calledUrl = url;
      calledHeaders = headers;
      return {
        audio_base64: Buffer.from("FAKEAUDIO").toString("base64"),
        alignment: {
          characters: ["H", "i", " ", "y", "o"],
          character_start_times_seconds: [0, 0.1, 0.2, 0.3, 0.4],
          character_end_times_seconds: [0.1, 0.2, 0.3, 0.4, 0.6],
        },
      };
    };

    const tts = new ElevenLabsTtsProvider({ apiKey: "k", voiceId: "v1", http });
    const result = await tts.synthesize("Hi yo", dir);

    expect(calledUrl).toContain("/v1/text-to-speech/v1/with-timestamps");
    expect(calledHeaders["xi-api-key"]).toBe("k");
    expect(result.durationSec).toBe(0.6);
    expect(result.words[0].word).toBe("Hi");
    const audio = await readFile(result.audioPath, "utf8");
    expect(audio).toBe("FAKEAUDIO");
  });
});
