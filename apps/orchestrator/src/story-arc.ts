import {
  StoryError,
  readStoryBible,
  writeStoryBible,
  writeStoryPartDraft,
  type StoryBible,
  type WorkspaceLayout,
} from "@autosocial/core";
import {
  generateArc,
  updateBible,
  type StoryArcGenerator,
  type StoryCritic,
} from "@autosocial/story";

export interface StoryArcDeps {
  generator: StoryArcGenerator;
  critic: StoryCritic;
  layout: WorkspaceLayout;
  seriesId: string;
  arcId: string;
  numParts: number;
  targetMinutes: number;
  threshold: number;
  maxRevisions: number;
  // Used only when no bible exists yet for this series.
  seed?: { premise: string; genre: string };
}

export interface StoryArcSummary {
  arcId: string;
  partsWritten: number;
  partPaths: string[];
  score: number;
  passed: boolean;
  attempts: number;
}

function seedBible(seriesId: string, seed: { premise: string; genre: string }): StoryBible {
  return {
    seriesId,
    premise: seed.premise,
    genre: seed.genre,
    characters: [],
    worldRules: [],
    canon: [],
    openThreads: [],
    arcsCompleted: 0,
  };
}

// Generate one story arc for a series: load/seed the bible, generate+critique+revise an
// arc, write each part as a draft awaiting approval, then advance the persisted bible so
// the next arc continues the saga. Returns a summary (incl. the critic's score).
export async function runStoryArc(deps: StoryArcDeps): Promise<StoryArcSummary> {
  let bible = await readStoryBible(deps.layout, deps.seriesId);
  if (!bible) {
    if (!deps.seed) {
      throw new StoryError(
        `StoryError: no bible for series "${deps.seriesId}" and no seed provided`,
      );
    }
    bible = seedBible(deps.seriesId, deps.seed);
  }

  const result = await generateArc({
    generator: deps.generator,
    critic: deps.critic,
    bible,
    request: { arcId: deps.arcId, numParts: deps.numParts, targetMinutes: deps.targetMinutes },
    threshold: deps.threshold,
    maxRevisions: deps.maxRevisions,
  });

  const partPaths: string[] = [];
  for (const part of result.arc.parts) {
    partPaths.push(await writeStoryPartDraft(deps.layout, deps.seriesId, deps.arcId, part));
  }

  await writeStoryBible(deps.layout, updateBible(bible, result.arc));

  return {
    arcId: deps.arcId,
    partsWritten: result.arc.parts.length,
    partPaths,
    score: result.critique.score,
    passed: result.critique.passed,
    attempts: result.attempts,
  };
}
