import { describe, it, expect } from "vitest";
import { PROMPT_TEMPLATES, buildImagePrompt } from "./prompt-templates.js";

describe("prompt templates", () => {
  it("ships an apocalypse-horror preset with a {SCENE} slot and a no-text exclusion", () => {
    const t = PROMPT_TEMPLATES["apocalypse-horror"];
    expect(t).toBeTruthy();
    expect(t).toContain("{SCENE}");
    expect(t.toLowerCase()).toContain("no text"); // captions are burned on top
  });

  it("fills the {SCENE} placeholder with the scene description", () => {
    const out = buildImagePrompt("cinematic still. {SCENE}. film grain, no text", "a ruined city skyline");
    expect(out).toBe("cinematic still. a ruined city skyline. film grain, no text");
    expect(out).not.toContain("{SCENE}");
  });

  it("appends the description when the template has no placeholder", () => {
    const out = buildImagePrompt("cinematic, moody", "a ruined city skyline");
    expect(out).toBe("cinematic, moody. a ruined city skyline");
  });
});
