import {
  StoryError,
  type AnthropicClient,
  type StoryArc,
  type StoryCritique,
} from "@autosocial/core";
import { parseJsonRobust } from "./json-utils.js";

const SYSTEM = `You are a ruthless story editor for a binge-worthy faceless horror/apocalypse
video channel. The narration is HEARD aloud — judge it like a listener who will scroll away
the instant it gets boring or sounds AI-generated. Be HARSH: 70 is "good", 85 is "great",
95+ is "I would not stop watching this." Most arcs do not deserve 90+.

Score the arc 0-100 against this rubric (weight the OPENING most — it's where viewers leave):
- THE CORE HORROR MECHANISM (heaviest weight). Real horror = FACT + IMPOSSIBILITY, with
  the LISTENER doing the math. The narrator reports a plain physical observation and the
  thing it implies cannot be true; the listener's own brain produces the dread. If the
  narrator instead LABELS something as creepy/wrong/unnatural ("a wet syllable", "a voice
  that wasn't human", "something unspeakable"), the mechanism is broken — penalise HARD
  and quote the exact phrase that does the labelling.
  Examples of the mechanism done right (REWARD): "We're twenty thousand feet down.
  Something just knocked on the hull. There isn't anything down here big enough to make
  that sound." / "There were six plates on the table. There have been five of us since
  spring." / "The footprints in the basement go down. Just down."
  Examples done wrong (PUNISH): "The hull said my name in a wet voice." / "Something
  unnatural was happening." / "A chill I'll never forget." / "Wrong in a way I can't
  describe."
- THE OPENING (first 3 sentences of Part 1). Heavy weight. S1 = a flat physical fact
  (number, time, place, action) with no fear-adjectives. S2 = the impossibility this fact
  violates, still flat. S3 = a second observation that closes off innocent explanations.
  Penalize HARD any opening that:
  * tells the listener it is scary instead of letting them work it out
  * leads with abstract metaphor, weather, thesis statement, unattributed dialogue, or
    "let me tell you about"
  * uses fear-labels in S1/S2 ("strange", "wrong", "impossible", "terrible", "wet voice")
  * gives ambience before the impossibility (orients too slowly) OR drops the impossibility
    without any physical anchor (orients too suddenly)
  * sounds like an audiobook summary, a Wikipedia article, or any AI-written story
- Human voice: does it sound like a real person who lived it, told across a fire — NOT an AI
  summary? Penalise heavily for AI tells: "little did they know", "in a world where", "the
  world as we knew it", "I'll never forget", textbook exposition, tidy morals, generic
  phrasing, over-explaining, purple writing.
- AI-clever phrasing (HARD penalty — quote the exact phrase in the issues):
  * Synesthetic mash-ups where a sound is given a tactile/liquid adjective ("a wet
    syllable", "a damp scream", "an oily voice", "the air tasted like a name").
  * Personifying non-human sources as "trying to", "learning to", "remembering how to"
    do something human ("the hull learning my name").
  * Stacked tri-adjectives ("a long, wet, deliberate syllable").
  * Showy "like a ___" similes that exist to be admired rather than to clarify the image.
  These phrases tell the listener "an AI wrote this" — flag every one.
- Retention pull: every beat must make the listener NEED the next line. Read each paragraph
  aloud in your head — if any drops the tension, flag the exact line.
- Sensory floor: EVERY paragraph must contain at least one specific, photographable detail.
  Penalise paragraphs that are pure interiority/dialogue with no physical anchor.
- Genre craft: uses proven zombie/apocalypse beats (dread, survival rules, found-family
  stakes, the slow turn) but feels fresh and lived-in, not cliché or parody.
- Hard cliffhanger ending EVERY part (a turn/gut-punch, not a soft fade).
- Consistency with the story bible (characters, world rules, canon, open threads).
- Names: characters, ships, stations, and missions must use COMMON ordinary names (Sarah,
  Mike, Tom, Reed, Carter, "Station Four", "the Brooks expedition"). Penalise invented,
  literary, or unusual names (Marrow, Devlin, Maren, Voss, Hadal, Thalassa) — they sound
  AI-clever and pull the listener out. Quote any offender in the issues.

In "issues", quote the exact offending line for any opening problem or any sentence that
sounds AI. Be specific enough that the writer can fix the exact words. List the most
important issue FIRST.

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

    const parsed = await parseJsonRobust<{ score: number; issues?: string[] }>(
      raw,
      this.client,
    );
    if (!parsed) {
      throw new StoryError("StoryError: invalid JSON from model");
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
