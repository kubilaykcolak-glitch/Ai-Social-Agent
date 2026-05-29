# AI Image Prompting — Guide & Templates

How AutoSocialAgent prompts Higgsfield (FLUX / Soul) for on-theme, non-"slop" b-roll, and the
reusable templates to use for the next video or image.

## How the prompt is built (per scene)

```
heroScript → planScenes() → Scene.narration
            → [LLM scene-describer] → concise visual description ("{SCENE}")
            → buildImagePrompt(template, "{SCENE}") → final prompt → Higgsfield
```

1. **LLM scene-describer** (`apps/orchestrator/src/scene-describer.ts`) rewrites each scene's
   first-person narration into a tight, third-person **visual** description of one shot
   (subject + setting + action + light, < 40 words, no prose). This is the key anti-slop step —
   narration prose makes terrible image prompts.
2. **Template** (`packages/video/src/prompt-templates.ts`) wraps that description with the
   cinematic style scaffold. Set via `HIGGSFIELD_STYLE`; `{SCENE}` is the fill slot.

## Prompting principles (from FLUX / Higgsfield research)

- **Order:** `[Subject] → [Setting] → [Style] → [Lighting] → [Camera/Lens] → [detail tags]`.
  Put the subject **first** — burying it makes the model deprioritise it.
- **Natural sentences**, not keyword soup. FLUX/Soul read context.
- **Photographic language beats adjectives.** Not "ultra-realistic" — instead lens
  (`35mm anamorphic`), aperture (`f/2.0`), film stock (`Kodak Vision3`), named lighting
  (`low-key rim light`, `volumetric god rays`).
- **Describe how light behaves**, e.g. "god rays through haze, long shadows," not just "moody."
- **Keep it tight** (Higgsfield Soul: < ~100 words; longer dilutes the look).
- **Always add `no text` / `no watermark`** — the renderer burns captions on top, so the image
  must be text-free, and signage often renders garbled.
- **Consistency:** keep the same style template across an arc so episodes look like one series.

## Templates (presets)

Defined in `packages/video/src/prompt-templates.ts` (`PROMPT_TEMPLATES`). Each has a `{SCENE}`
slot. Select one by pasting it into `HIGGSFIELD_STYLE`.

### `apocalypse-horror` (default)
```
cinematic film still. {SCENE}. post-apocalyptic horror atmosphere, desolate and eerie,
desaturated teal-and-amber grade, consistent volumetric lighting, god rays through haze,
deep low-key shadows, dramatic rim light, fog and drifting ash, shot on ARRI Alexa,
35mm anamorphic lens, f/2.0 shallow depth of field, Kodak Vision3 film grain, rule of thirds,
no text, no watermark, no on-screen captions
```

### `noir-thriller`
```
cinematic film still. {SCENE}. neo-noir thriller mood, high-contrast chiaroscuro, wet streets
and neon reflections, cold blue-and-amber grade, consistent volumetric lighting, shot on ARRI
Alexa, 50mm lens, f/1.8 shallow depth of field, subtle film grain, rule of thirds, no text,
no watermark
```

### `liminal-dread`
```
cinematic film still. {SCENE}. unsettling liminal-space dread, empty and uncanny, flat
fluorescent lighting with sickly green cast, faded retro color grade, soft haze, shot on 35mm,
f/4 medium depth of field, VHS-era grain, centered composition, no text, no watermark
```

## Tuning tips

- **Too busy / wrong subject?** The scene-describer may be over-describing — it's capped at ~40
  words; tighten the SYSTEM prompt in `scene-describer.ts` if needed.
- **Faces look off?** This is faceless-channel b-roll — prefer wide/environment shots; the default
  template avoids faces in focus. Add "seen from behind" or "silhouette" in the style for figures.
- **Aspect:** `HIGGSFIELD_ASPECT` (default `9:16`). One image serves both 9:16 and 16:9 (the
  renderer center-crops); 9:16 source degrades to 16:9 more gracefully than the reverse.
- **New series look:** add a preset to `PROMPT_TEMPLATES`, or just set `HIGGSFIELD_STYLE` in `.env`.

## Sources
- FLUX prompt structure & technical language: skywork.ai, fal.ai, designhero.tv, getimg.ai
- Higgsfield Soul (prompt length, volumetric lighting, "no text"): higgsfield.ai/soul-intro, segmind
