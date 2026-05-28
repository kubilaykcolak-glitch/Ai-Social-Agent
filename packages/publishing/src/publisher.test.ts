import { describe, it, expect } from "vitest";
import type { GeneratedContent, PlatformAdapter, PublishResult } from "@autosocial/core";
import { DefaultPublisher } from "./publisher.js";

const content: GeneratedContent = {
  brief: { trend: { id: "t", topic: "x", score: 1, source: "s", keywords: [] }, platforms: ["instagram", "tiktok"] },
  perPlatform: [
    { platform: "instagram", body: "hi", hashtags: ["#a"] },
    { platform: "tiktok", body: "hi", hashtags: ["#a"] },
  ],
};

class OkAdapter implements PlatformAdapter {
  constructor(public readonly name: any) {}
  validate() { return { valid: true, errors: [] }; }
  async publish(): Promise<PublishResult> { return { platform: this.name, status: "published", id: "1" }; }
}

class ThrowAdapter implements PlatformAdapter {
  readonly name = "tiktok" as const;
  validate() { return { valid: true, errors: [] }; }
  async publish(): Promise<PublishResult> { throw new Error("boom"); }
}

describe("DefaultPublisher", () => {
  it("publishes to each requested platform", async () => {
    const pub = new DefaultPublisher([new OkAdapter("instagram"), new OkAdapter("tiktok")]);
    const results = await pub.publish(content, ["instagram", "tiktok"]);
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.status === "published")).toBe(true);
  });

  it("isolates a failing adapter without aborting others", async () => {
    const pub = new DefaultPublisher([new OkAdapter("instagram"), new ThrowAdapter()]);
    const results = await pub.publish(content, ["instagram", "tiktok"]);
    expect(results.find((r) => r.platform === "instagram")?.status).toBe("published");
    expect(results.find((r) => r.platform === "tiktok")?.status).toBe("failed");
  });

  it("reports missing adapter as failed", async () => {
    const pub = new DefaultPublisher([new OkAdapter("instagram")]);
    const results = await pub.publish(content, ["youtube"]);
    expect(results[0].status).toBe("failed");
  });
});
