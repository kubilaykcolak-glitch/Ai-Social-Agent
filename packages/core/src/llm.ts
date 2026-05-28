import type { AppConfig } from "./config.js";
import type { AnthropicClient } from "./anthropic-client.js";
import { SdkAnthropicClient } from "./anthropic-client.js";
import { ClaudeCodeClient } from "./claude-code-client.js";

// Build the LLM client the agent should use, based on config.
// Default ("claude-code") runs on the local Claude subscription via the Agent SDK
// and needs no API key. "api" uses the metered Anthropic API and requires a key.
export function createLlmClient(config: AppConfig): AnthropicClient {
  if (config.llmClient === "api") {
    if (!config.anthropicApiKey) {
      throw new Error(
        "LLM_CLIENT=api requires ANTHROPIC_API_KEY. Set it, or use the default LLM_CLIENT=claude-code.",
      );
    }
    return new SdkAnthropicClient(config.anthropicApiKey, config.anthropicModel);
  }
  return new ClaudeCodeClient(config.anthropicModel);
}
