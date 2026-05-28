import { query } from "@anthropic-ai/claude-agent-sdk";
import type { AnthropicClient } from "./anthropic-client.js";

// AnthropicClient backed by the local Claude Code / Agent SDK.
// Authenticates with the user's existing Claude login (subscription) via the CLI,
// so it does not require an ANTHROPIC_API_KEY. Runs a single-turn, tool-less
// completion and returns the final assistant text.
export class ClaudeCodeClient implements AnthropicClient {
  constructor(private model?: string) {}

  async complete(system: string, user: string): Promise<string> {
    let result = "";
    for await (const message of query({
      prompt: user,
      options: {
        systemPrompt: system,
        model: this.model,
        maxTurns: 1,
        allowedTools: [],
      },
    })) {
      if (message.type === "result" && message.subtype === "success") {
        result = message.result;
      }
    }
    return result;
  }
}
