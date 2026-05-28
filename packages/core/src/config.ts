export type LlmClientKind = "claude-code" | "api";

export interface AppConfig {
  anthropicApiKey: string;
  anthropicModel: string;
  reviewScoreThreshold: number;
  topicApprovalThreshold: number;
  workspaceDir: string;
  llmClient: LlmClientKind;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const llmClient: LlmClientKind = env.LLM_CLIENT === "api" ? "api" : "claude-code";
  return {
    anthropicApiKey: env.ANTHROPIC_API_KEY ?? "",
    anthropicModel: env.ANTHROPIC_MODEL ?? "claude-opus-4-7",
    reviewScoreThreshold: Number(env.REVIEW_SCORE_THRESHOLD ?? "70"),
    topicApprovalThreshold: Number(env.TOPIC_SCORE_THRESHOLD ?? "60"),
    workspaceDir: env.WORKSPACE_DIR ?? "./workspace",
    llmClient,
  };
}
