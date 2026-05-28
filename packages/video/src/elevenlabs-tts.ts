import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { TtsProvider, TtsResult, WordTiming } from "./types.js";

// Injectable HTTP so the provider is testable without network/keys.
export type HttpPostJson = (
  url: string,
  headers: Record<string, string>,
  body: unknown,
) => Promise<unknown>;

interface WithTimestampsResponse {
  audio_base64: string;
  alignment: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  };
}

// Convert ElevenLabs per-character timings into per-word timings.
export function charsToWords(
  characters: string[],
  starts: number[],
  ends: number[],
): WordTiming[] {
  const words: WordTiming[] = [];
  let cur = "";
  let s = 0;
  let e = 0;
  for (let i = 0; i < characters.length; i++) {
    const ch = characters[i];
    if (/\s/.test(ch)) {
      if (cur) {
        words.push({ word: cur, startSec: s, endSec: e });
        cur = "";
      }
    } else {
      if (!cur) s = starts[i];
      cur += ch;
      e = ends[i];
    }
  }
  if (cur) words.push({ word: cur, startSec: s, endSec: e });
  return words;
}

const defaultHttpPostJson: HttpPostJson = async (url, headers, body) => {
  const f = (globalThis as { fetch: (input: string, init?: unknown) => Promise<any> }).fetch;
  const res = await f(url, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  return res.json();
};

export interface ElevenLabsTtsOptions {
  apiKey: string;
  voiceId: string;
  model?: string;
  baseUrl?: string;
  http?: HttpPostJson;
}

export class ElevenLabsTtsProvider implements TtsProvider {
  private http: HttpPostJson;
  private baseUrl: string;
  private model: string;

  constructor(private opts: ElevenLabsTtsOptions) {
    this.http = opts.http ?? defaultHttpPostJson;
    this.baseUrl = opts.baseUrl ?? "https://api.elevenlabs.io";
    this.model = opts.model ?? "eleven_multilingual_v2";
  }

  async synthesize(text: string, outDir: string): Promise<TtsResult> {
    await mkdir(outDir, { recursive: true });
    const url = `${this.baseUrl}/v1/text-to-speech/${this.opts.voiceId}/with-timestamps`;
    const res = (await this.http(
      url,
      { "xi-api-key": this.opts.apiKey, "Content-Type": "application/json" },
      { text, model_id: this.model },
    )) as WithTimestampsResponse;

    const audioPath = join(outDir, "voiceover.mp3");
    await writeFile(audioPath, Buffer.from(res.audio_base64, "base64"));

    const a = res.alignment;
    const words = charsToWords(
      a.characters,
      a.character_start_times_seconds,
      a.character_end_times_seconds,
    );
    const ends = a.character_end_times_seconds;
    const durationSec = ends.length > 0 ? ends[ends.length - 1] : 0;

    return { audioPath, durationSec, words };
  }
}
