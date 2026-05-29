import {
  StoryError,
  type AnthropicClient,
  type BibleUpdate,
  type StoryArc,
  type StoryArcRequest,
  type StoryBible,
  type StoryPart,
} from "@autosocial/core";

const SYSTEM = `You are a master serialized-fiction writer for faceless short-form video
channels. Write a COMPLETE, coherent story arc as a single whole, then split it into the
requested number of cliffhanger parts. Craft for retention:
- Every part opens with a strong cold-open hook in the first sentence.
- Tension rises across the arc; each part ends on a genuine cliffhanger.
- Stay strictly consistent with the provided story bible (characters, world rules, canon,
  open threads). Pay off or deliberately advance the open threads.
- Avoid cliché and filler. Concrete, specific, vivid. No slop.
For each part write a "heroScript" (the full long-form narration for the YouTube hero,
sized to the target minutes) AND a punchy "teaserScript" (a ~60s vertical hook that ends on
the cliffhanger and tells viewers the full story is on YouTube).
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
