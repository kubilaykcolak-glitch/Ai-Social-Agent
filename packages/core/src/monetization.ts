import type {
  GeneratedContent,
  MonetizationDirective,
  MonetizationPlan,
  PlatformContent,
  PlatformName,
  SponsorCampaign,
} from "./types.js";
import { buildUtmUrl } from "./utm.js";

export interface SelectMonetizationOpts {
  keywords: string[];
  platform: PlatformName;
  now: Date;
  postId?: string;
}

function isActive(c: SponsorCampaign, nowMs: number, platform: PlatformName): boolean {
  if (c.status !== "active") return false;
  if (!c.platforms.includes(platform)) return false;
  const startMs = Date.parse(c.start);
  const endMs = Date.parse(c.end) + 86_399_999; // end date inclusive (end of day)
  return nowMs >= startMs && nowMs <= endMs;
}

function keywordOverlap(campaignKeywords: string[], topicKeywords: string[]): number {
  if (campaignKeywords.length === 0) return 0; // matches any, but no positive signal
  const set = new Set(topicKeywords.map((k) => k.toLowerCase()));
  return campaignKeywords.filter((k) => set.has(k.toLowerCase())).length;
}

// Pick the monetisation slot for one platform: an active matching sponsor if any,
// otherwise the cross-promo target (never cross-promoting YouTube to itself).
export function selectMonetization(
  plan: MonetizationPlan,
  opts: SelectMonetizationOpts,
): MonetizationDirective | null {
  const nowMs = opts.now.getTime();

  const candidates = plan.sponsors
    .filter((c) => isActive(c, nowMs, opts.platform))
    .filter((c) => c.keywords.length === 0 || keywordOverlap(c.keywords, opts.keywords) > 0)
    .sort((a, b) => keywordOverlap(b.keywords, opts.keywords) - keywordOverlap(a.keywords, opts.keywords));

  const sponsor = candidates[0];
  if (sponsor) {
    return {
      kind: "sponsor",
      campaignId: sponsor.id,
      cta: sponsor.cta,
      url: buildUtmUrl(sponsor.url, {
        source: opts.platform,
        campaign: sponsor.id,
        content: opts.postId,
      }),
      disclosure: sponsor.disclosure,
    };
  }

  // Cross-promo: point other platforms to the ad-monetised hero. YouTube IS the
  // hero, so it never cross-promotes to itself.
  if (plan.crossPromo && opts.platform !== "youtube") {
    const cp = plan.crossPromo;
    const cta =
      cp.ctaByPlatform?.[opts.platform] ?? cp.defaultCta ?? `Watch the full video: ${cp.name}`;
    return {
      kind: "crosspromo",
      cta,
      url: buildUtmUrl(cp.url, {
        source: opts.platform,
        campaign: "crosspromo",
        content: opts.postId,
      }),
    };
  }

  return null;
}

function ctaLine(d: MonetizationDirective): string {
  const prefix = d.disclosure ? `${d.disclosure} ` : "";
  return `${prefix}${d.cta}: ${d.url}`;
}

export interface ApplyMonetizationOpts {
  now: Date;
  postId: string;
}

// Deterministically append the monetisation CTA + tracked link to each platform's
// body, so every post carries a revenue pointer (sponsor slot or cross-promo).
export function applyMonetization(
  content: GeneratedContent,
  plan: MonetizationPlan,
  opts: ApplyMonetizationOpts,
): GeneratedContent {
  const perPlatform: PlatformContent[] = content.perPlatform.map((pc) => {
    const directive = selectMonetization(plan, {
      keywords: content.brief.trend.keywords,
      platform: pc.platform,
      now: opts.now,
      postId: opts.postId,
    });
    if (!directive) return pc;
    return { ...pc, body: `${pc.body}\n\n${ctaLine(directive)}` };
  });
  return { brief: content.brief, perPlatform };
}
