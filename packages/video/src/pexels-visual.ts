import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Scene, VisualProvider, VisualResult } from "./types.js";

export type HttpGetJson = (url: string, headers: Record<string, string>) => Promise<unknown>;
export type DownloadBinary = (url: string) => Promise<Uint8Array>;

interface PexelsSearchResponse {
  photos: Array<{ src: { large2x?: string; original?: string } }>;
}

const defaultHttpGetJson: HttpGetJson = async (url, headers) => {
  const f = (globalThis as { fetch: (input: string, init?: unknown) => Promise<any> }).fetch;
  const res = await f(url, { headers });
  if (!res.ok) throw new Error(`Pexels ${res.status}: ${await res.text()}`);
  return res.json();
};

const defaultDownload: DownloadBinary = async (url) => {
  const f = (globalThis as { fetch: (input: string, init?: unknown) => Promise<any> }).fetch;
  const res = await f(url);
  if (!res.ok) throw new Error(`Pexels download ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
};

export interface PexelsVisualOptions {
  apiKey: string;
  orientation?: "portrait" | "landscape" | "square";
  baseUrl?: string;
  httpGetJson?: HttpGetJson;
  download?: DownloadBinary;
}

export class PexelsVisualProvider implements VisualProvider {
  readonly kind = "stock" as const;
  private httpGetJson: HttpGetJson;
  private download: DownloadBinary;
  private baseUrl: string;
  private orientation: string;

  constructor(private opts: PexelsVisualOptions) {
    this.httpGetJson = opts.httpGetJson ?? defaultHttpGetJson;
    this.download = opts.download ?? defaultDownload;
    this.baseUrl = opts.baseUrl ?? "https://api.pexels.com";
    this.orientation = opts.orientation ?? "portrait";
  }

  async fetch(scene: Scene, outDir: string): Promise<VisualResult> {
    await mkdir(outDir, { recursive: true });
    const url = `${this.baseUrl}/v1/search?query=${encodeURIComponent(
      scene.visualQuery,
    )}&per_page=1&orientation=${this.orientation}`;
    const res = (await this.httpGetJson(url, {
      Authorization: this.opts.apiKey,
    })) as PexelsSearchResponse;

    const photo = res.photos?.[0];
    if (!photo) throw new Error(`Pexels: no results for "${scene.visualQuery}"`);
    const imgUrl = photo.src.large2x ?? photo.src.original;
    if (!imgUrl) throw new Error("Pexels: photo has no usable src");

    const bytes = await this.download(imgUrl);
    const path = join(outDir, `scene-${scene.index}.jpg`);
    await writeFile(path, Buffer.from(bytes));
    return { sceneIndex: scene.index, path, kind: this.kind };
  }
}
