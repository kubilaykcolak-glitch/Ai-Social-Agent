import type { AnthropicClient } from "@autosocial/core";
import type { Scene } from "@autosocial/video";

const SYSTEM = `You are a cinematographer turning story narration into ONE image-generation
prompt. Describe a single cinematic shot: only what is literally VISIBLE — subject, setting,
action, time of day, weather, composition. Third person, present tense. Do NOT include
first-person voice, dialogue, inner thoughts, story exposition, or character names unless
they describe what's seen. Keep it under 40 words. Respond with ONLY the description — no
preamble, no quotes.`;

export type SceneDescriber = (scene: Scene) => Promise<string>;

// Build an LLM-backed describer that rewrites a scene's narration prose into a concise,
// FLUX-friendly visual description. The image-prompt template then wraps this.
export function createSceneDescriber(client: AnthropicClient): SceneDescriber {
  return async (scene) => {
    const raw = await client.complete(SYSTEM, scene.narration);
    return raw.trim().replace(/^["']+|["']+$/g, "").trim();
  };
}
