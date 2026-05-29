import { describe, it, expect } from "vitest";
import type { AnthropicClient } from "@autosocial/core";
import type { Scene } from "@autosocial/video";
import { createSceneDescriber } from "./scene-describer.js";

const scene: Scene = {
  index: 0,
  narration: "I'm Mara Voss. Forty days ago I checked mall receipts. Now I count breaths in the dark.",
  visualQuery: "mara voss mall receipts dark",
};

function captureClient(reply: string, onUser: (u: string) => void): AnthropicClient {
  return {
    complete: async (_system: string, user: string) => {
      onUser(user);
      return reply;
    },
  };
}

describe("createSceneDescriber", () => {
  it("turns scene narration into a trimmed visual description", async () => {
    let seenUser = "";
    const describe = createSceneDescriber(
      captureClient(
        '  A lone woman crouches in a pitch-black abandoned mall corridor, faint emergency light.  ',
        (u) => {
          seenUser = u;
        },
      ),
    );
    const out = await describe(scene);
    expect(seenUser).toContain("Mara Voss"); // narration is sent to the model
    expect(out).toBe("A lone woman crouches in a pitch-black abandoned mall corridor, faint emergency light.");
  });

  it("strips surrounding quotes the model may add", async () => {
    const describe = createSceneDescriber(captureClient('"A ruined city under ash-grey sky."', () => {}));
    expect(await describe(scene)).toBe("A ruined city under ash-grey sky.");
  });
});
