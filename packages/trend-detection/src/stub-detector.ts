import type { Trend, TrendDetector } from "@autosocial/core";

const SEED: Trend[] = [
  { id: "t1", topic: "AI productivity tools", score: 92, source: "stub", keywords: ["ai", "productivity", "automation"] },
  { id: "t2", topic: "Sustainable fashion", score: 81, source: "stub", keywords: ["sustainability", "fashion", "eco"] },
  { id: "t3", topic: "Home barista setups", score: 74, source: "stub", keywords: ["coffee", "espresso", "home"] },
  { id: "t4", topic: "Indie game dev", score: 68, source: "stub", keywords: ["gamedev", "indie", "unity"] },
];

export class StubTrendDetector implements TrendDetector {
  async detect(limit: number): Promise<Trend[]> {
    return [...SEED].sort((a, b) => b.score - a.score).slice(0, limit);
  }
}
