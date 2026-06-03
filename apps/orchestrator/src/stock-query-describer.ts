import type { AnthropicClient } from "@autosocial/core";
import type { Scene } from "@autosocial/video";

const SYSTEM = `You write stock-photo search queries (Pexels, Unsplash) from story narration.
The narration is a slice of a moody horror/apocalypse story. Your job is to pick the BEST
SINGLE shot a stock library could realistically have that *visually* supports this slice
and matches its mood — NOT to describe what literally happens in the prose.

Rules:
- Output 2–6 lowercase keywords, space-separated. No punctuation, no quotes, no commentary.
- Match the literal subject AND the mood (dim, eerie, claustrophobic, wet, industrial).
- Prefer concrete, photographable things stock libraries actually have: "dark submarine
  corridor", "rusted metal hatch", "deep ocean abyss", "flooded tunnel", "abandoned hallway
  flashlight", "rain on porthole", "dim engine room", "empty bunk", "fog at sea".
- NEVER use proper nouns, character names, dialogue, brand names, or story specifics.
- If the scene is mostly internal/dialogue, pick a setting/atmosphere shot that fits the
  beat (e.g. for "I went to wake her", choose "dim bunk room cabin", NOT "person waking").
- Avoid people-centric searches unless the beat really demands it; stock people shots rarely
  match horror tone and break immersion. Prefer environments, objects, and textures.

Respond with ONLY the keyword query. No prose.`;

export type StockQueryDescriber = (scene: Scene) => Promise<string>;

// Build an LLM-backed describer that turns scene narration into a stock-library
// search query tuned for mood + literal visual concept. Falls back to the raw
// keyword bag if the model output is empty.
export function createStockQueryDescriber(client: AnthropicClient): StockQueryDescriber {
  return async (scene) => {
    const raw = await client.complete(SYSTEM, scene.narration);
    return raw
      .trim()
      .replace(/^["']+|["']+$/g, "")
      .replace(/[.,!?;:]+$/g, "")
      .trim();
  };
}
