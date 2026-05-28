export interface UtmParams {
  source: string; // utm_source, e.g. the platform name
  medium?: string; // utm_medium, defaults to "social"
  campaign: string; // utm_campaign, e.g. sponsor id or "crosspromo"
  content?: string; // utm_content, e.g. the post id (per-post attribution)
}

// Append UTM query params to a URL, preserving any existing query/hash.
export function buildUtmUrl(base: string, params: UtmParams): string {
  const url = new URL(base);
  url.searchParams.set("utm_source", params.source);
  url.searchParams.set("utm_medium", params.medium ?? "social");
  url.searchParams.set("utm_campaign", params.campaign);
  if (params.content) url.searchParams.set("utm_content", params.content);
  return url.toString();
}
