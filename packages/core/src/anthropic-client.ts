import Anthropic from "@anthropic-ai/sdk";

export interface AnthropicClient {
  complete(system: string, user: string): Promise<string>;
}

export class SdkAnthropicClient implements AnthropicClient {
  private client: Anthropic;
  constructor(
    apiKey: string,
    private model: string,
    private maxTokens = 2048,
  ) {
    this.client = new Anthropic({ apiKey });
  }

  async complete(system: string, user: string): Promise<string> {
    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: user }],
    });
    const block = res.content.find((b) => b.type === "text");
    return block && block.type === "text" ? block.text : "";
  }
}
