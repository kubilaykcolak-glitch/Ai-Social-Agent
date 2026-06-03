import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Scene, VisualProvider, VisualResult } from "./types.js";

export type HttpGetJson = (url: string, headers: Record<string, string>) => Promise<unknown>;
export type DownloadBinary = (url: string) => Promise<Uint8Array>;

// Optional LLM-backed rewriter that turns a scene's narration into a stock-photo
// search query (mood + literal visual concept, no story specifics or names).
// Returns a short keyword string the stock API can match on.
export type StockQueryDescriber = (scene: Scene) => Promise<string>;

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
  // Optional LLM rewriter that produces a stock-search query for each scene. When
  // present, used in preference to the raw `scene.visualQuery` (which is just bag-of-
  // keywords from the narration and matches stock libraries poorly).
  describeStockQuery?: StockQueryDescriber;
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

  // Build the search query for a scene. Prefer the LLM-written stock query (visual
  // concept + mood) over the raw narration keyword bag, which tends to surface
  // off-topic photos (e.g. a stranger in bed for "I went to wake Mira").
  private async resolveQuery(scene: Scene): Promise<string> {
    if (!this.opts.describeStockQuery) return scene.visualQuery;
    try {
      const q = (await this.opts.describeStockQuery(scene)).trim();
      return q || scene.visualQuery;
    } catch {
      return scene.visualQuery;
    }
  }

  async fetch(scene: Scene, outDir: string): Promise<VisualResult> {
    await mkdir(outDir, { recursive: true });
    const primary = await this.resolveQuery(scene);
    // Fall back to the raw keyword bag if the LLM query returns nothing on Pexels.
    const queries = [primary, scene.visualQuery].filter(
      (q, i, arr) => q && arr.indexOf(q) === i,
    );

    let photo: PexelsSearchResponse["photos"][number] | undefined;
    let lastQuery = primary;
    for (const query of queries) {
      lastQuery = query;
      const url = `${this.baseUrl}/v1/search?query=${encodeURIComponent(
        query,
      )}&per_page=1&orientation=${this.orientation}`;
      const res = (await this.httpGetJson(url, {
        Authorization: this.opts.apiKey,
      })) as PexelsSearchResponse;
      if (res.photos && res.photos.length > 0) {
        photo = res.photos[0];
        break;
      }
    }

    if (!photo) throw new Error(`Pexels: no results for "${lastQuery}"`);
    const imgUrl = photo.src.large2x ?? photo.src.original;
    if (!imgUrl) throw new Error("Pexels: photo has no usable src");

    const bytes = await this.download(imgUrl);
    const path = join(outDir, `scene-${scene.index}.jpg`);
    await writeFile(path, Buffer.from(bytes));
    return { sceneIndex: scene.index, path, kind: this.kind };
  }
}
