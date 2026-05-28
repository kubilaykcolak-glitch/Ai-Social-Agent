export interface AppConfig {
  anthropicApiKey: string;
  anthropicModel: string;
  reviewScoreThreshold: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    anthropicApiKey: env.ANTHROPIC_API_KEY ?? "",
    anthropicModel: env.ANTHROPIC_MODEL ?? "claude-opus-4-7",
    reviewScoreThreshold: Number(env.REVIEW_SCORE_THRESHOLD ?? "70"),
  };
}
