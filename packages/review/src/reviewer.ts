import {
  ReviewError,
  type AnthropicClient,
  type ContentReviewer,
  type GeneratedContent,
  type ReviewResult,
} from "@autosocial/core";

const SYSTEM = `You are a strict social media content critic. Score the provided
content 0-100 on clarity, on-brand voice, and engagement potential. List concrete
issues and a suggested revision. Respond with ONLY valid JSON of the form:
{"score":<number>,"issues":["..."],"suggestedRevision":"..."}`;

export class AnthropicContentReviewer implements ContentReviewer {
  constructor(private client: AnthropicClient) {}

  async review(content: GeneratedContent, threshold: number): Promise<ReviewResult> {
    let raw: string;
    try {
      raw = await this.client.complete(SYSTEM, JSON.stringify(content.perPlatform));
    } catch (err) {
      throw new ReviewError("ReviewError: model call failed", err);
    }

    let parsed: { score: number; issues: string[]; suggestedRevision?: string };
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new ReviewError("ReviewError: invalid JSON from model", err);
    }

    if (typeof parsed.score !== "number") {
      throw new ReviewError("ReviewError: missing score");
    }

    return {
      score: parsed.score,
      issues: parsed.issues ?? [],
      suggestedRevision: parsed.suggestedRevision || undefined,
      passed: parsed.score >= threshold,
    };
  }
}
