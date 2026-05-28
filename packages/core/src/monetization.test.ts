import { describe, it, expect } from "vitest";
import type { GeneratedContent, MonetizationPlan, SponsorCampaign } from "./types.js";
import { selectMonetization, applyMonetization } from "./monetization.js";

const sponsor: SponsorCampaign = {
  id: "acme-q2",
  sponsor: "Acme",
  status: "active",
  start: "2026-05-01",
  end: "2026-06-30",
  platforms: ["instagram", "twitter", "youtube"],
  keywords: ["ai", "productivity"],
  talkingPoint: "Acme automates your busywork",
  cta: "Try Acme free",
  url: "https://acme.com/offer",
  disclosure: "#ad",
  payout: { type: "flat", amount: 500 },
};

const plan: MonetizationPlan = {
  crossPromo: {
    name: "My YouTube",
    url: "https://youtube.com/@me",
    ctaByPlatform: { instagram: "Full video — link in bio" },
  },
  sponsors: [sponsor],
};

const now = new Date("2026-05-15T12:00:00.000Z");

describe("selectMonetization", () => {
  it("returns an active sponsor slot when platform + keywords + dates match", () => {
    const d = selectMonetization(plan, { keywords: ["ai"], platform: "instagram", now, postId: "p1" });
    expect(d?.kind).toBe("sponsor");
    expect(d?.campaignId).toBe("acme-q2");
    expect(d?.disclosure).toBe("#ad");
    expect(d?.url).toContain("utm_campaign=acme-q2");
    expect(d?.url).toContain("utm_source=instagram");
    expect(d?.url).toContain("utm_content=p1");
  });

  it("ignores a sponsor outside its flight dates and falls back to cross-promo", () => {
    const past = new Date("2026-07-15T12:00:00.000Z");
    const d = selectMonetization(plan, { keywords: ["ai"], platform: "instagram", now: past, postId: "p1" });
    expect(d?.kind).toBe("crosspromo");
    expect(d?.cta).toBe("Full video — link in bio");
    expect(d?.url).toContain("youtube.com");
    expect(d?.url).toContain("utm_campaign=crosspromo");
  });

  it("does not cross-promo YouTube to itself (returns null when no sponsor)", () => {
    const d = selectMonetization(plan, { keywords: ["cooking"], platform: "youtube", now, postId: "p1" });
    expect(d).toBeNull();
  });

  it("still serves the sponsor on YouTube when it matches", () => {
    const d = selectMonetization(plan, { keywords: ["ai"], platform: "youtube", now, postId: "p1" });
    expect(d?.kind).toBe("sponsor");
  });

  it("falls back to cross-promo when keywords do not match any sponsor", () => {
    const d = selectMonetization(plan, { keywords: ["gardening"], platform: "twitter", now, postId: "p1" });
    expect(d?.kind).toBe("crosspromo");
  });
});

describe("applyMonetization", () => {
  const content: GeneratedContent = {
    brief: {
      trend: { id: "t1", topic: "AI tools", score: 90, source: "stub", keywords: ["ai"] },
      platforms: ["instagram", "youtube"],
    },
    perPlatform: [
      { platform: "instagram", body: "Post body", hashtags: ["#ai"] },
      { platform: "youtube", body: "Script body", hashtags: [] },
    ],
  };

  it("appends sponsor CTA + tracked link + disclosure to each matching platform", () => {
    const out = applyMonetization(content, plan, { now, postId: "post_42" });
    const ig = out.perPlatform.find((p) => p.platform === "instagram")!;
    const yt = out.perPlatform.find((p) => p.platform === "youtube")!;
    expect(ig.body).toContain("Post body");
    expect(ig.body).toContain("#ad Try Acme free:");
    expect(ig.body).toContain("utm_content=post_42");
    // youtube matches the sponsor too (keywords ai), so it gets the slot
    expect(yt.body).toContain("Try Acme free:");
  });

  it("leaves a platform body unchanged when no directive applies", () => {
    const noSponsorPlan: MonetizationPlan = { sponsors: [] }; // no cross-promo either
    const out = applyMonetization(content, noSponsorPlan, { now, postId: "post_42" });
    expect(out.perPlatform[0].body).toBe("Post body");
  });
});
