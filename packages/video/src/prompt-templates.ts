// Reusable image-prompt templates (style "wrappers") for AI visual generation.
// Each template is a FLUX/Higgsfield-optimised scaffold with a {SCENE} slot that gets
// filled with a per-scene visual description. Built from prompting research:
// natural-language sentences, subject first, real photographic terms (lens/aperture/
// film stock/lighting), and "no text" (the renderer burns captions on top).
//
// Select via HIGGSFIELD_STYLE (paste a template string) or reference one of these names.

export const PROMPT_TEMPLATES: Record<string, string> = {
  "apocalypse-horror":
    "cinematic film still. {SCENE}. post-apocalyptic horror atmosphere, desolate and eerie, " +
    "desaturated teal-and-amber grade, consistent volumetric lighting, god rays through haze, " +
    "deep low-key shadows, dramatic rim light, fog and drifting ash, shot on ARRI Alexa, " +
    "35mm anamorphic lens, f/2.0 shallow depth of field, Kodak Vision3 film grain, rule of thirds, " +
    "no text, no watermark, no on-screen captions",

  "noir-thriller":
    "cinematic film still. {SCENE}. neo-noir thriller mood, high-contrast chiaroscuro, " +
    "wet streets and neon reflections, cold blue-and-amber grade, consistent volumetric lighting, " +
    "shot on ARRI Alexa, 50mm lens, f/1.8 shallow depth of field, subtle film grain, " +
    "rule of thirds, no text, no watermark",

  "liminal-dread":
    "cinematic film still. {SCENE}. unsettling liminal-space dread, empty and uncanny, " +
    "flat fluorescent lighting with sickly green cast, faded retro color grade, soft haze, " +
    "shot on 35mm, f/4 medium depth of field, VHS-era grain, centered composition, " +
    "no text, no watermark",
};

export const DEFAULT_TEMPLATE = PROMPT_TEMPLATES["apocalypse-horror"];

// Fill a template's {SCENE} slot with the scene description. If the template has no
// {SCENE} placeholder, the description is appended as a sentence.
export function buildImagePrompt(template: string, sceneDescription: string): string {
  const desc = sceneDescription.trim();
  if (template.includes("{SCENE}")) {
    return template.split("{SCENE}").join(desc).trim();
  }
  return `${template.trim()}. ${desc}`;
}
