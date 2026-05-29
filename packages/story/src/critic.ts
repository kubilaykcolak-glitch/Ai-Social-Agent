import {
  StoryError,
  type AnthropicClient,
  type StoryArc,
  type StoryCritique,
} from "@autosocial/core";

const SYSTEM = `You are a ruthless story editor for a binge-worthy serialized video channel.
Score the provided story arc 0-100 against this rubric:
- Cold-open hook strength of each part (does the first line grab?).
- Rising tension across the arc and a genuine cliffhanger ending every part.
- Consistency with the story bible (characters, world rules, canon, open threads).
- Pacing, specificity, originality. Penalise cliché, filler, and generic "slop".
List concrete, actionable issues to fix. Respond with ONLY valid JSON of the form:
{"score":<number>,"issues":["..."]}`;

export class StoryCritic {
  constructor(private client: AnthropicClient) {}

  async critique(arc: StoryArc, threshold: number): Promise<StoryCritique> {
    let raw: string;
    try {
      raw = await this.client.complete(SYSTEM, JSON.stringify(arc));
    } catch (err) {
      throw new StoryError("StoryError: model call failed", err);
    }

    let parsed: { score: number; issues?: string[] };
    try {
      parsed = JSON.parse(raw) as { score: number; issues?: string[] };
    } catch (err) {
      throw new StoryError("StoryError: invalid JSON from model", err);
    }

    if (typeof parsed.score !== "number") {
      throw new StoryError("StoryError: missing score");
    }

    return {
      score: parsed.score,
      issues: parsed.issues ?? [],
      passed: parsed.score >= threshold,
    };
  }
}
