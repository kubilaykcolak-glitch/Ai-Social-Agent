import type { AnthropicClient } from "@autosocial/core";

// Try to recover JSON the model wrapped in prose or markdown fences.
function stripFences(raw: string): string {
  let s = raw.trim();
  // Strip ```json ... ``` or ``` ... ``` fences if present.
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(s);
  if (fence) s = fence[1].trim();
  // Fall back to the largest brace-delimited substring.
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    s = s.slice(first, last + 1);
  }
  return s;
}

// Parse JSON robustly. If the raw text parses, return it. Otherwise strip fences and
// retry. As a last resort, ask the LLM to repair its own output and try again. Returns
// null if all attempts fail.
export async function parseJsonRobust<T>(
  raw: string,
  client?: AnthropicClient,
): Promise<T | null> {
  const attempts = [raw, stripFences(raw)];
  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // try next strategy
    }
  }

  if (!client) return null;

  const REPAIR_SYSTEM = `You repair malformed JSON. The user will give you a string that was
meant to be JSON but failed to parse (commonly because of unescaped quotes inside string
values, trailing commas, or surrounding prose). Return ONLY the corrected, valid JSON with
the same data and structure — no commentary, no code fences. Preserve all content; escape
embedded quotes correctly with backslashes.`;

  let repaired: string;
  try {
    repaired = await client.complete(REPAIR_SYSTEM, raw);
  } catch {
    return null;
  }

  for (const candidate of [repaired, stripFences(repaired)]) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // give up
    }
  }
  return null;
}
