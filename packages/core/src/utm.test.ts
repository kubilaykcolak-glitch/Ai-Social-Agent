import { describe, it, expect } from "vitest";
import { buildUtmUrl } from "./utm.js";

describe("buildUtmUrl", () => {
  it("adds utm params with default medium", () => {
    const url = new URL(buildUtmUrl("https://youtube.com/@me", { source: "instagram", campaign: "crosspromo" }));
    expect(url.searchParams.get("utm_source")).toBe("instagram");
    expect(url.searchParams.get("utm_medium")).toBe("social");
    expect(url.searchParams.get("utm_campaign")).toBe("crosspromo");
  });

  it("sets utm_content for per-post attribution", () => {
    const url = new URL(
      buildUtmUrl("https://acme.com/offer", {
        source: "twitter",
        medium: "social",
        campaign: "acme-q2",
        content: "post_123",
      }),
    );
    expect(url.searchParams.get("utm_content")).toBe("post_123");
    expect(url.searchParams.get("utm_campaign")).toBe("acme-q2");
  });

  it("preserves an existing query string", () => {
    const url = new URL(buildUtmUrl("https://acme.com/offer?ref=abc", { source: "tiktok", campaign: "acme-q2" }));
    expect(url.searchParams.get("ref")).toBe("abc");
    expect(url.searchParams.get("utm_source")).toBe("tiktok");
  });
});
