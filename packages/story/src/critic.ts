import {
  StoryError,
  type AnthropicClient,
  type StoryArc,
  type StoryCritique,
} from "@autosocial/core";

const SYSTEM = `You are a ruthless story editor for a binge-worthy faceless horror/apocalypse
video channel. The narration is HEARD aloud — judge it like a listener who will scroll away
the instant it gets boring or sounds AI-generated. Score the arc 0-100 against this rubric:
- 3-second hook: does Part 1's first line grab instantly? Soft/explanatory openings fail hard.
- Human voice: does it sound like a real person who lived it, told across a fire — NOT an AI
  summary? Penalise heavily for AI tells: "little did they know", "in a world where", textbook
  exposition, tidy morals, generic phrasing, over-explaining, purple writing.
- Retention pull: does every beat make you NEED the next line? Read it aloud in your head.
- Concrete sensory specificity (specific objects, sounds, smells) over vague description.
- Genre craft: uses proven zombie/apocalypse beats (dread, survival rules, found-family
  stakes, the slow turn) but feels fresh and lived-in, not cliché or parody.
- Hard cliffhanger ending EVERY part (a turn/gut-punch, not a soft fade).
- Consistency with the story bible (characters, world rules, canon, open threads).
List concrete, actionable issues to fix — especially any line that sounds AI or kills momentum.
Respond with ONLY valid JSON of the form:
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
