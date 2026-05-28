import {
  GenerationError,
  type AnthropicClient,
  type ContentBrief,
  type ContentGenerator,
  type GeneratedContent,
  type PlatformContent,
} from "@autosocial/core";

const SYSTEM = `You are a social media content writer. Given a trend and a list of
target platforms, write tailored content for each platform. For "youtube", write a
short video script in the body. Respond with ONLY valid JSON of the form:
{"perPlatform":[{"platform":"<name>","body":"<text>","hashtags":["#tag"]}]}`;

export class AnthropicContentGenerator implements ContentGenerator {
  constructor(private client: AnthropicClient) {}

  async generate(brief: ContentBrief): Promise<GeneratedContent> {
    const user = JSON.stringify({
      topic: brief.trend.topic,
      keywords: brief.trend.keywords,
      platforms: brief.platforms,
      tone: brief.tone ?? "engaging and concise",
    });

    let raw: string;
    try {
      raw = await this.client.complete(SYSTEM, user);
    } catch (err) {
      throw new GenerationError("GenerationError: model call failed", err);
    }

    let parsed: { perPlatform: PlatformContent[] };
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new GenerationError("GenerationError: invalid JSON from model", err);
    }

    if (!parsed.perPlatform || !Array.isArray(parsed.perPlatform)) {
      throw new GenerationError("GenerationError: missing perPlatform array");
    }

    return { brief, perPlatform: parsed.perPlatform };
  }
}
