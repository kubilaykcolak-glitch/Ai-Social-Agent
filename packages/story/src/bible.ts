import type { StoryArc, StoryBible } from "@autosocial/core";

// Apply an arc's bibleUpdate to the series bible, returning a NEW bible (pure).
// New characters are appended unless their name already exists; resolved threads are
// removed from openThreads; new canon and new threads are appended; arcsCompleted bumps.
export function updateBible(bible: StoryBible, arc: StoryArc): StoryBible {
  const u = arc.bibleUpdate;
  const existingNames = new Set(bible.characters.map((c) => c.name));
  const characters = [
    ...bible.characters,
    ...u.newCharacters.filter((c) => !existingNames.has(c.name)),
  ];
  const resolved = new Set(u.resolvedThreads);
  const openThreads = [
    ...bible.openThreads.filter((t) => !resolved.has(t)),
    ...u.newThreads,
  ];
  return {
    ...bible,
    characters,
    canon: [...bible.canon, ...u.newCanon],
    openThreads,
    arcsCompleted: bible.arcsCompleted + 1,
  };
}
