import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Scene, VisualProvider, VisualResult } from "./types.js";

// Injectable HTTP so the submit/poll/download flow is unit-testable without the live API.
export type HiggsfieldPostJson = (
  url: string,
  body: unknown,
  headers: Record<string, string>,
) => Promise<unknown>;
export type HiggsfieldGetJson = (url: string, headers: Record<string, string>) => Promise<unknown>;
export type HiggsfieldDownload = (url: string) => Promise<Uint8Array>;

const defaultPostJson: HiggsfieldPostJson = async (url, body, headers) => {
  const f = (globalThis as { fetch: (i: string, init?: unknown) => Promise<any> }).fetch;
  const res = await f(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Higgsfield ${res.status}: ${await res.text()}`);
  return res.json();
};

const defaultGetJson: HiggsfieldGetJson = async (url, headers) => {
  const f = (globalThis as { fetch: (i: string, init?: unknown) => Promise<any> }).fetch;
  const res = await f(url, { headers });
  if (!res.ok) throw new Error(`Higgsfield ${res.status}: ${await res.text()}`);
  return res.json();
};

const defaultDownload: HiggsfieldDownload = async (url) => {
  const f = (globalThis as { fetch: (i: string, init?: unknown) => Promise<any> }).fetch;
  const res = await f(url);
  if (!res.ok) throw new Error(`Higgsfield download ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
};

export interface HiggsfieldVisualOptions {
  apiKey: string;
  model?: string; // default "flux"
  style?: string; // prepended to every scene prompt
  width?: number;
  height?: number;
  steps?: number;
  baseUrl?: string;
  pollIntervalMs?: number;
  maxPolls?: number;
  httpPostJson?: HiggsfieldPostJson;
  httpGetJson?: HiggsfieldGetJson;
  download?: HiggsfieldDownload;
}

interface SubmitResponse {
  id: string;
  status?: string;
}
interface PollResponse {
  id?: string;
  status?: string;
  error?: string;
  results?: Array<{ url?: string }>;
  output?: { url?: string };
  image_url?: string;
  url?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Pull the finished image URL out of a completed poll response, tolerating the few
// shapes the API may use (pinned precisely against live docs during verification).
function extractImageUrl(p: PollResponse): string | undefined {
  return p.results?.[0]?.url ?? p.output?.url ?? p.image_url ?? p.url;
}

// AI image provider backed by the Higgsfield Cloud REST API (text-to-image, e.g. FLUX).
// Submits an async generation, polls until completion, downloads the still.
export class HiggsfieldVisualProvider implements VisualProvider {
  readonly kind = "ai" as const;
  private postJson: HiggsfieldPostJson;
  private getJson: HiggsfieldGetJson;
  private download: HiggsfieldDownload;
  private baseUrl: string;
  private pollIntervalMs: number;
  private maxPolls: number;

  constructor(private opts: HiggsfieldVisualOptions) {
    this.postJson = opts.httpPostJson ?? defaultPostJson;
    this.getJson = opts.httpGetJson ?? defaultGetJson;
    this.download = opts.download ?? defaultDownload;
    this.baseUrl = opts.baseUrl ?? "https://api.higgsfield.ai";
    this.pollIntervalMs = opts.pollIntervalMs ?? 1500;
    this.maxPolls = opts.maxPolls ?? 80;
  }

  private buildPrompt(scene: Scene): string {
    const style = this.opts.style?.trim();
    return style ? `${style}. ${scene.narration}` : scene.narration;
  }

  private headers(): Record<string, string> {
    return { Authorization: `Bearer ${this.opts.apiKey}` };
  }

  async fetch(scene: Scene, outDir: string): Promise<VisualResult> {
    await mkdir(outDir, { recursive: true });

    const submitted = (await this.postJson(
      `${this.baseUrl}/v1/generations`,
      {
        task: "text-to-image",
        model: this.opts.model ?? "flux",
        prompt: this.buildPrompt(scene),
        width: this.opts.width ?? 1024,
        height: this.opts.height ?? 1024,
        ...(this.opts.steps ? { steps: this.opts.steps } : {}),
      },
      this.headers(),
    )) as SubmitResponse;

    if (!submitted.id) throw new Error("Higgsfield: submit returned no generation id");

    let imageUrl: string | undefined;
    for (let i = 0; i < this.maxPolls; i++) {
      const poll = (await this.getJson(
        `${this.baseUrl}/v1/generations/${submitted.id}`,
        this.headers(),
      )) as PollResponse;

      const status = (poll.status ?? "").toLowerCase();
      if (status === "completed" || status === "succeeded") {
        imageUrl = extractImageUrl(poll);
        break;
      }
      if (status === "failed" || status === "error") {
        throw new Error(`Higgsfield generation failed: ${poll.error ?? status}`);
      }
      await sleep(this.pollIntervalMs);
    }

    if (!imageUrl) {
      throw new Error(`Higgsfield generation timed out after ${this.maxPolls} polls`);
    }

    const bytes = await this.download(imageUrl);
    const path = join(outDir, `scene-${scene.index}.png`);
    await writeFile(path, Buffer.from(bytes));
    return { sceneIndex: scene.index, path, kind: this.kind };
  }
}
