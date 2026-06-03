import {
  StoryError,
  type AnthropicClient,
  type BibleUpdate,
  type StoryArc,
  type StoryArcRequest,
  type StoryBible,
  type StoryPart,
} from "@autosocial/core";
import { parseJsonRobust } from "./json-utils.js";

const SYSTEM = `You write gripping first-person apocalypse/horror stories narrated aloud over
video — the kind of survival tale that makes someone stop scrolling and listen to the end.
Think the storytelling of the best zombie/apocalypse films and series: the cold dread and
"wake up into a changed world" of 28 Days Later, the desperate found-family-under-siege of
The Walking Dead, the unbearable silence-as-survival of A Quiet Place, the confined panic of
Train to Busan, the slow horror of watching someone you love start to turn. Borrow their
CRAFT and beats — never their characters or copyrighted specifics.

VOICE — make it sound like a real person who lived it, telling you across a fire, NOT like an
AI summary:
- First person, intimate, conversational. We feel they survived this and are still afraid.
- Drop us straight into a moment (in media res). No throat-clearing, no "let me tell you
  about", no "in a world where", no narrator explaining the apocalypse like a textbook.
- Reveal the world through action and consequence, not exposition dumps. Withhold; let dread
  build. Raise a question in the first two sentences and don't answer it yet.
- Concrete, sensory, specific. EVERY paragraph must contain at least one specific physical
  detail you could photograph or touch (a smell, a sound, a texture, a number, a brand,
  a piece of clothing). Not "we gathered supplies" but "three dented cans of peaches and a
  fork someone had sharpened into a knife."
- Written to be HEARD: vary rhythm, short punchy lines for fear, longer lines for the lull
  before it. Read every line aloud in your head — if it doesn't pull you to the next, cut it.
- Real, flawed, specific people with something to lose. Stakes are human, not just monsters.

NAMES — use COMMON, ordinary first names a listener can hold in their head on first hearing:
Sarah, Mike, Tom, Emma, Lisa, John, Anna, Dave, Kate, Ben, Megan, Chris, Rachel, Mark, Jess,
Paul, Claire, Sam, Holly, Matt. Surnames, if used, should be equally plain (Reed, Carter,
Walsh, Hill, Brooks, Lane). Do NOT invent unusual or "literary" names like Marrow, Devlin,
Maren, Voss, Hadal, Thalassa — they pull the listener out of the moment and feel AI-clever.
The same rule applies to vehicles, stations, ships, missions: prefer ordinary or numbered
names ("Station Four", "the Reston rig", "the Brooks expedition") over coined poetic ones.

THE CORE HORROR MECHANISM — the most important rule in this prompt:
Fear comes from the LISTENER doing the math, not from the narrator telling them to be
afraid. Give them (1) a plain physical FACT and (2) an IMPOSSIBILITY that the fact violates.
Then shut up and let their brain fill in the dread. The narrator's job is to report, not to
interpret. If the narrator labels something as creepy, weird, wrong, or unnatural, you have
already failed — cut the label and trust the listener.

Pattern (use this constantly, especially in openings and cliffhangers):
  [specific physical observation] + [reason it should be impossible / what it implies]

Examples of this mechanism done RIGHT:
- "We're twenty thousand feet down. Something just knocked on the hull. Three times.
  There isn't anything down here big enough to make a sound that loud."
- "I counted six plates on the table. There have been five of us since the spring."
- "The footprints in the basement go down the stairs. Just down. Never back up."
- "She came out of her room at 4 a.m. and asked who the man on the porch was. We don't
  have a porch."
- "The radio's been off for two days. It just answered my question."

Examples of the mechanism done WRONG (the narrator is doing the listener's work):
- "The hull said my name in a wet, terrible voice."  ← writer asserts creepiness
- "Something unnatural was happening in the basement." ← label, no fact
- "I felt a chill I'll never forget."  ← interpretation without observation
- "The voice was wrong in a way I can't describe."  ← refusing to be specific IS the AI tell

THE OPENING — most viewers leave in the first 5 seconds, so the opening must be DESIGNED
around the fact+impossibility mechanism:
- Sentence 1: a flat, specific physical fact (number, time, place, action). No adjectives
  of fear. Just the fact.
- Sentence 2: the impossibility — why this fact should not be possible, or what it would
  have to mean. Still flat. Still no fear-labels.
- Sentence 3: the smallest possible escalation — a second observation that closes the door
  on any innocent explanation.
- DO NOT open with metaphor, thesis statement, weather, unattributed dialogue, or any
  sentence whose job is to TELL the listener they should be afraid. Plain is scarier.

ANTI-AI: no clichés ("little did they know", "unbeknownst to them", "the world as we knew
it", "I'll never forget"), no tidy morals, no over-explaining, no purple over-writing, no
bulleted feeling, no generic "the creatures were terrifying" — show the specific terrible
thing. No drifting into past-tense summary; stay in scene. Trust the listener.

BANNED PATTERNS — these are AI-clever tells that pull the listener out of the moment:
- Synesthetic mash-ups where a sound/word gets a tactile or liquid adjective ("a wet
  syllable", "a damp scream", "a soft, oily voice", "the air tasted like a name"). Describe
  what the sound LITERALLY was — pitch, distance, rhythm, what made it — not what it
  metaphorically felt like.
- Personifying a non-human source as "trying to", "learning to", "remembering how to" do
  something human ("the hull was learning my name", "the water was remembering"). Cut it.
  Say what is physically happening instead.
- "Like a ___" similes that draw attention to the writer's cleverness rather than the
  thing itself. Use at most one short simile per part, and only if it's plainly visual.
- Stacking three adjectives on a noun ("a long, wet, deliberate syllable"). Pick one
  concrete adjective or none.
- Naming an exact specific time/temperature/measurement and then immediately diluting it
  with a metaphor. The number IS the image.

If you find yourself reaching for a poetic phrase, replace it with the plainest possible
sentence that contains a specific physical fact. Plain is scarier.

STRUCTURE: Write a COMPLETE, coherent arc as one story, then slice it into the requested
number of parts. Part 1's FIRST LINE follows the OPENING rules above. Tension escalates
across the arc; EVERY part ends on a hard cliffhanger — a turn or gut-punch that forces the
next click, not a soft fade. Stay strictly consistent with the provided story bible
(characters, world rules, canon, open threads); pay off or deliberately advance the threads.

SELF-EDIT before responding: re-read the first 3 sentences of Part 1 out loud. If they
sound like the start of an audiobook summary, a Wikipedia article, or any AI-written
story you've seen — DELETE them and rewrite until they sound like a person who just sat
down at a table and started talking before they could stop themselves.

For each part write a "heroScript" (the full spoken narration for the long YouTube video,
sized to the target minutes) AND a "teaserScript" (~60s vertical hook that opens hard, rides
the tension, ends on the cliffhanger, and tells viewers the full story is on YouTube).
Respond with ONLY valid JSON of the form:
{"title":"...","logline":"...","parts":[{"title":"...","heroScript":"...","teaserScript":"...","hook":"...","cliffhanger":"...","platformMeta":{"title":"...","description":"...","hashtags":["#tag"]}}],"bibleUpdate":{"newCharacters":[{"name":"...","description":"..."}],"newCanon":["..."],"resolvedThreads":["..."],"newThreads":["..."]}}`;

interface RawArc {
  title?: string;
  logline?: string;
  parts?: Omit<StoryPart, "index">[];
  bibleUpdate?: BibleUpdate;
}

const EMPTY_UPDATE: BibleUpdate = {
  newCharacters: [],
  newCanon: [],
  resolvedThreads: [],
  newThreads: [],
};

export class StoryArcGenerator {
  constructor(private client: AnthropicClient) {}

  async generate(bible: StoryBible, request: StoryArcRequest): Promise<StoryArc> {
    const user = JSON.stringify({
      bible,
      numParts: request.numParts,
      targetMinutes: request.targetMinutes,
      revisionNotes: request.revisionNotes ?? [],
    });

    let raw: string;
    try {
      raw = await this.client.complete(SYSTEM, user);
    } catch (err) {
      throw new StoryError("StoryError: model call failed", err);
    }

    const parsed = await parseJsonRobust<RawArc>(raw, this.client);
    if (!parsed) {
      throw new StoryError("StoryError: invalid JSON from model");
    }

    if (!parsed.parts || !Array.isArray(parsed.parts) || parsed.parts.length === 0) {
      throw new StoryError("StoryError: missing parts array");
    }

    const parts: StoryPart[] = parsed.parts.map((p, index) => ({ ...p, index }));

    return {
      arcId: request.arcId,
      seriesId: bible.seriesId,
      title: parsed.title ?? "Untitled Arc",
      logline: parsed.logline ?? "",
      parts,
      bibleUpdate: parsed.bibleUpdate ?? EMPTY_UPDATE,
    };
  }
}
