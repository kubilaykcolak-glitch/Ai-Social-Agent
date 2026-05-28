import { describe, it, expect } from "vitest";
import { createVideoGenerator } from "./factory.js";
import { DefaultVideoGenerator } from "./generator.js";

describe("createVideoGenerator", () => {
  it("returns a DefaultVideoGenerator regardless of provider availability", () => {
    const stubbed = createVideoGenerator({ visualSource: "stock", videoRenderer: "stub" });
    expect(stubbed).toBeInstanceOf(DefaultVideoGenerator);

    const real = createVideoGenerator({
      visualSource: "stock",
      videoRenderer: "ffmpeg",
      pexelsApiKey: "pk",
      elevenLabsApiKey: "el",
    });
    expect(real).toBeInstanceOf(DefaultVideoGenerator);
  });
});
