export type LlmClientKind = "claude-code" | "api";
export type VisualSource = "stock" | "ai";
export type VideoRenderer = "ffmpeg" | "stub";

export interface AppConfig {
  anthropicApiKey: string;
  anthropicModel: string;
  reviewScoreThreshold: number;
  topicApprovalThreshold: number;
  storyScoreThreshold: number;
  storyMaxRevisions: number;
  workspaceDir: string;
  llmClient: LlmClientKind;
  visualSource: VisualSource;
  // Video providers (empty key -> stub provider is used instead)
  elevenLabsApiKey: string;
  elevenLabsVoiceId: string;
  elevenLabsModel: string;
  pexelsApiKey: string;
  videoRenderer: VideoRenderer;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const llmClient: LlmClientKind = env.LLM_CLIENT === "api" ? "api" : "claude-code";
  const visualSource: VisualSource = env.VISUAL_SOURCE === "ai" ? "ai" : "stock";
  const videoRenderer: VideoRenderer = env.VIDEO_RENDERER === "stub" ? "stub" : "ffmpeg";
  return {
    anthropicApiKey: env.ANTHROPIC_API_KEY ?? "",
    anthropicModel: env.ANTHROPIC_MODEL ?? "claude-opus-4-7",
    reviewScoreThreshold: Number(env.REVIEW_SCORE_THRESHOLD ?? "70"),
    topicApprovalThreshold: Number(env.TOPIC_SCORE_THRESHOLD ?? "60"),
    storyScoreThreshold: Number(env.STORY_SCORE_THRESHOLD ?? "75"),
    storyMaxRevisions: Number(env.STORY_MAX_REVISIONS ?? "2"),
    workspaceDir: env.WORKSPACE_DIR ?? "./workspace",
    llmClient,
    visualSource,
    elevenLabsApiKey: env.ELEVENLABS_API_KEY ?? "",
    elevenLabsVoiceId: env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM",
    elevenLabsModel: env.ELEVENLABS_MODEL ?? "eleven_multilingual_v2",
    pexelsApiKey: env.PEXELS_API_KEY ?? "",
    videoRenderer,
  };
}
