import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Scene, VisualProvider, VisualResult } from "./types.js";

// Generates one image for `prompt` and returns its URL. Injectable so the provider is
// unit-testable without the SDK, network, or credentials.
export type HiggsfieldGenerate = (prompt: string) => Promise<string>;
export type HiggsfieldDownload = (url: string) => Promise<Uint8Array>;

// Minimal shape of the official SDK's V2Response we rely on.
interface V2Response {
  status: string;
  images?: Array<{ url: string }>;
}

const DEFAULT_ENDPOINT = "flux-pro/kontext/max/text-to-image";

// Default generator: uses the official @higgsfield/client v2 SDK (credentials = "key:secret"),
// submits a text-to-image job, polls to completion, and returns the image URL.
function defaultGenerate(
  credentials: string,
  endpoint: string,
  aspectRatio: string,
): HiggsfieldGenerate {
  return async (prompt) => {
    const { createHiggsfieldClient } = (await import("@higgsfield/client/v2")) as {
      createHiggsfieldClient: (cfg: { credentials: string }) => {
        subscribe: (
          ep: string,
          opts: { input: Record<string, unknown>; withPolling?: boolean },
        ) => Promise<V2Response>;
      };
    };
    const client = createHiggsfieldClient({ credentials });
    const res = await client.subscribe(endpoint, {
      input: { prompt, aspect_ratio: aspectRatio },
      withPolling: true,
    });
    if (res.status !== "completed") {
      throw new Error(`Higgsfield generation not completed (status: ${res.status})`);
    }
    const url = res.images?.[0]?.url;
    if (!url) throw new Error("Higgsfield: completed response had no image url");
    return url;
  };
}

const defaultDownload: HiggsfieldDownload = async (url) => {
  const f = (globalThis as { fetch: (i: string, init?: unknown) => Promise<any> }).fetch;
  const res = await f(url);
  if (!res.ok) throw new Error(`Higgsfield download ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
};

export interface HiggsfieldVisualOptions {
  credentials: string; // "apiKey:apiSecret"
  endpoint?: string; // text-to-image service id
  style?: string; // prepended to every scene prompt
  aspectRatio?: string; // e.g. "9:16"
  generate?: HiggsfieldGenerate;
  download?: HiggsfieldDownload;
}

// AI image provider backed by the official Higgsfield SDK (text-to-image, e.g. FLUX).
export class HiggsfieldVisualProvider implements VisualProvider {
  readonly kind = "ai" as const;
  private generate: HiggsfieldGenerate;
  private download: HiggsfieldDownload;

  constructor(private opts: HiggsfieldVisualOptions) {
    this.generate =
      opts.generate ??
      defaultGenerate(
        opts.credentials,
        opts.endpoint ?? DEFAULT_ENDPOINT,
        opts.aspectRatio ?? "9:16",
      );
    this.download = opts.download ?? defaultDownload;
  }

  private buildPrompt(scene: Scene): string {
    const style = this.opts.style?.trim();
    return style ? `${style}. ${scene.narration}` : scene.narration;
  }

  async fetch(scene: Scene, outDir: string): Promise<VisualResult> {
    await mkdir(outDir, { recursive: true });
    const url = await this.generate(this.buildPrompt(scene));
    const bytes = await this.download(url);
    const path = join(outDir, `scene-${scene.index}.png`);
    await writeFile(path, Buffer.from(bytes));
    return { sceneIndex: scene.index, path, kind: this.kind };
  }
}
