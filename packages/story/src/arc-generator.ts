import {
  StoryError,
  type AnthropicClient,
  type BibleUpdate,
  type StoryArc,
  type StoryArcRequest,
  type StoryBible,
  type StoryPart,
} from "@autosocial/core";

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
- Concrete, sensory, specific. Not "we gathered supplies" but "three dented cans of peaches
  and a fork someone had sharpened into a knife." Smell, sound, texture, temperature.
- Written to be HEARD: vary rhythm, short punchy lines for fear, longer lines for the lull
  before it. Read every line aloud in your head — if it doesn't pull you to the next, cut it.
- Real, flawed, specific people with something to lose. Stakes are human, not just monsters.

ANTI-AI: no clichés ("little did they know", "unbeknownst to them"), no tidy morals, no
over-explaining, no purple over-writing, no bulleted feeling, no generic "the creatures were
terrifying" — show the specific terrible thing. Trust the listener.

STRUCTURE: Write a COMPLETE, coherent arc as one story, then slice it into the requested
number of parts. Part 1's FIRST LINE must be a hook that grabs in 3 seconds. Tension escalates
across the arc; EVERY part ends on a hard cliffhanger — a turn or gut-punch that forces the
next click, not a soft fade. Stay strictly consistent with the provided story bible
(characters, world rules, canon, open threads); pay off or deliberately advance the threads.

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

    let parsed: RawArc;
    try {
      parsed = JSON.parse(raw) as RawArc;
    } catch (err) {
      throw new StoryError("StoryError: invalid JSON from model", err);
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
