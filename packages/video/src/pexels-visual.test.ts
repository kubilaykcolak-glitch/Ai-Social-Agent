import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PexelsVisualProvider, type HttpGetJson, type DownloadBinary } from "./pexels-visual.js";
import type { Scene } from "./types.js";

const scene: Scene = { index: 2, narration: "x", visualQuery: "ai productivity" };

describe("PexelsVisualProvider", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "pexels-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("searches with the query + orientation, downloads, and saves the image", async () => {
    let calledUrl = "";
    let auth = "";
    const httpGetJson: HttpGetJson = async (url, headers) => {
      calledUrl = url;
      auth = headers.Authorization;
      return { photos: [{ src: { large2x: "https://img/large.jpg" } }] };
    };
    const download: DownloadBinary = async () => new TextEncoder().encode("IMG");

    const provider = new PexelsVisualProvider({ apiKey: "pk", httpGetJson, download });
    const result = await provider.fetch(scene, dir);

    expect(calledUrl).toContain("query=ai%20productivity");
    expect(calledUrl).toContain("orientation=portrait");
    expect(auth).toBe("pk");
    expect(result.kind).toBe("stock");
    expect(result.path).toContain("scene-2.jpg");
    expect(await readFile(result.path, "utf8")).toBe("IMG");
  });

  it("throws when there are no results", async () => {
    const httpGetJson: HttpGetJson = async () => ({ photos: [] });
    const provider = new PexelsVisualProvider({ apiKey: "pk", httpGetJson, download: async () => new Uint8Array() });
    await expect(provider.fetch(scene, dir)).rejects.toThrow(/no results/);
  });
});
