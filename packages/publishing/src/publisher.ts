import type {
  GeneratedContent,
  PlatformAdapter,
  PlatformName,
  PublishResult,
  Publisher,
} from "@autosocial/core";
import { InstagramAdapter } from "./adapters/instagram.js";
import { TiktokAdapter } from "./adapters/tiktok.js";
import { TwitterAdapter } from "./adapters/twitter.js";
import { YoutubeAdapter } from "./adapters/youtube.js";
import { CmsAdapter } from "./adapters/cms.js";

export class DefaultPublisher implements Publisher {
  private adapters: Map<PlatformName, PlatformAdapter>;

  constructor(adapters?: PlatformAdapter[]) {
    const list = adapters ?? [
      new InstagramAdapter(),
      new TiktokAdapter(),
      new TwitterAdapter(),
      new YoutubeAdapter(),
      new CmsAdapter(),
    ];
    this.adapters = new Map(list.map((a) => [a.name, a]));
  }

  async publish(
    content: GeneratedContent,
    platforms: PlatformName[],
  ): Promise<PublishResult[]> {
    const results: PublishResult[] = [];
    for (const platform of platforms) {
      const adapter = this.adapters.get(platform);
      if (!adapter) {
        results.push({ platform, status: "failed", error: "no adapter registered" });
        continue;
      }
      try {
        results.push(await adapter.publish(content));
      } catch (err) {
        results.push({
          platform,
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    return results;
  }
}
