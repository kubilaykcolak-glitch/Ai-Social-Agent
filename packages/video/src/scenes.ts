import type { Scene } from "./types.js";

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "to", "of", "in", "on", "for", "with",
  "is", "are", "was", "were", "be", "this", "that", "it", "as", "at", "by",
  "your", "you", "we", "they", "i", "so", "if", "then", "than", "from", "into",
]);

function keywords(text: string): string {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  const significant = words.filter((w) => !STOPWORDS.has(w));
  const picked = (significant.length > 0 ? significant : words).slice(0, 5);
  return picked.join(" ");
}

// Split a script into scenes. Paragraphs (blank-line separated) become scenes;
// a single-block script is split into sentences. Deterministic — swappable for an
// LLM-based planner later.
export function planScenes(script: string): Scene[] {
  const trimmed = script.trim();
  if (!trimmed) return [];

  let blocks = trimmed.split(/\n\s*\n+/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length <= 1) {
    blocks = trimmed
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return blocks.map((narration, index) => ({
    index,
    narration,
    visualQuery: keywords(narration),
  }));
}
