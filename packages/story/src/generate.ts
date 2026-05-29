import type { StoryArc, StoryArcRequest, StoryBible, StoryCritique } from "@autosocial/core";
import type { StoryArcGenerator } from "./arc-generator.js";
import type { StoryCritic } from "./critic.js";

export interface GenerateArcDeps {
  generator: StoryArcGenerator;
  critic: StoryCritic;
  bible: StoryBible;
  request: StoryArcRequest;
  threshold: number;
  maxRevisions: number;
}

export interface GenerateArcResult {
  arc: StoryArc;
  critique: StoryCritique;
  attempts: number;
}

// Generate an arc, critique it, and revise (feeding the critic's issues back into the
// generator) until it passes the threshold or revisions are exhausted. On exhaustion,
// returns the best-scoring attempt with passed=false rather than looping forever.
export async function generateArc(deps: GenerateArcDeps): Promise<GenerateArcResult> {
  const { generator, critic, bible, request, threshold, maxRevisions } = deps;
  let best: { arc: StoryArc; critique: StoryCritique } | null = null;
  let notes = request.revisionNotes ?? [];
  let attempts = 0;

  while (attempts <= maxRevisions) {
    attempts++;
    const arc = await generator.generate(bible, { ...request, revisionNotes: notes });
    const critique = await critic.critique(arc, threshold);
    if (!best || critique.score > best.critique.score) best = { arc, critique };
    if (critique.passed) return { arc, critique, attempts };
    notes = critique.issues;
  }

  return { arc: best!.arc, critique: best!.critique, attempts };
}
