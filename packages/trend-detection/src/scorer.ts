import type {
  AnthropicClient,
  RawTopic,
  ScoredTopic,
  TrendScorer,
} from "@autosocial/core";

const SYSTEM = `You rank social-media topic ideas. For EACH topic you are given,
score it 0-100 on two axes:
- viralScore: likelihood of high reach/engagement right now
- relevanceScore: fit with a tech/productivity content brand
Give a one-sentence rationale. Respond with ONLY valid JSON of the form:
{"scored":[{"topic":"<verbatim topic>","viralScore":<n>,"relevanceScore":<n>,"rationale":"<text>"}]}`;

interface ScoredEntry {
  topic: string;
  viralScore: number;
  relevanceScore: number;
  rationale: string;
}

function slug(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export class AnthropicTrendScorer implements TrendScorer {
  constructor(
    private client: AnthropicClient,
    private approvalThreshold: number,
  ) {}

  async score(topics: RawTopic[], limit: number): Promise<ScoredTopic[]> {
    if (topics.length === 0) return [];

    const raw = await this.client.complete(
      SYSTEM,
      JSON.stringify(topics.map((t) => ({ topic: t.topic, keywords: t.keywords ?? [] }))),
    );

    let parsed: { scored: ScoredEntry[] };
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new Error("TrendScorer: invalid JSON from model", { cause: err });
    }
    if (!parsed.scored || !Array.isArray(parsed.scored)) {
      throw new Error("TrendScorer: missing scored array");
    }

    const byTopic = new Map(topics.map((t) => [t.topic.toLowerCase(), t]));

    const scored: ScoredTopic[] = parsed.scored.map((e) => {
      const source = byTopic.get(e.topic.toLowerCase());
      const finalScore = Math.round((e.viralScore + e.relevanceScore) / 2);
      return {
        id: slug(e.topic),
        topic: e.topic,
        score: finalScore,
        source: source?.source ?? "inbox",
        keywords: source?.keywords ?? [],
        viralScore: e.viralScore,
        relevanceScore: e.relevanceScore,
        finalScore,
        rationale: e.rationale,
        approved: finalScore >= this.approvalThreshold,
      };
    });

    scored.sort((a, b) => b.finalScore - a.finalScore);
    return scored.slice(0, limit);
  }
}
