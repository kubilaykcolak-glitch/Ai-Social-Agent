import { describe, it, expect } from "vitest";
import { loadConfig } from "./config.js";
import { createLlmClient } from "./llm.js";
import { SdkAnthropicClient } from "./anthropic-client.js";
import { ClaudeCodeClient } from "./claude-code-client.js";

describe("loadConfig", () => {
  it("defaults to claude-code client and ./workspace", () => {
    const cfg = loadConfig({});
    expect(cfg.llmClient).toBe("claude-code");
    expect(cfg.workspaceDir).toBe("./workspace");
    expect(cfg.topicApprovalThreshold).toBe(60);
    expect(cfg.reviewScoreThreshold).toBe(70);
  });

  it("honors env overrides", () => {
    const cfg = loadConfig({
      LLM_CLIENT: "api",
      WORKSPACE_DIR: "/data/ws",
      TOPIC_SCORE_THRESHOLD: "75",
    });
    expect(cfg.llmClient).toBe("api");
    expect(cfg.workspaceDir).toBe("/data/ws");
    expect(cfg.topicApprovalThreshold).toBe(75);
  });
});

describe("createLlmClient", () => {
  it("returns ClaudeCodeClient by default", () => {
    const client = createLlmClient(loadConfig({}));
    expect(client).toBeInstanceOf(ClaudeCodeClient);
  });

  it("returns SdkAnthropicClient when LLM_CLIENT=api and a key is present", () => {
    const client = createLlmClient(loadConfig({ LLM_CLIENT: "api", ANTHROPIC_API_KEY: "sk-test" }));
    expect(client).toBeInstanceOf(SdkAnthropicClient);
  });

  it("throws when LLM_CLIENT=api but no key is set", () => {
    expect(() => createLlmClient(loadConfig({ LLM_CLIENT: "api" }))).toThrow(/ANTHROPIC_API_KEY/);
  });
});
