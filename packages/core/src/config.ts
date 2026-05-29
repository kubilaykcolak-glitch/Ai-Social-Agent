export type LlmClientKind = "claude-code" | "api";
export type VisualSource = "stock" | "ai";
export type VideoRenderer = "ffmpeg" | "stub";
export type VideoVisibility = "private" | "unlisted" | "public";

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
  // AI image generation (VISUAL_SOURCE=ai). Needs BOTH key+secret, else stub visual.
  higgsfieldApiKey: string;
  higgsfieldApiSecret: string;
  higgsfieldImageModel: string; // text-to-image service id
  higgsfieldAspect: string; // e.g. "9:16"
  higgsfieldStyle: string;
  videoRenderer: VideoRenderer;
  // YouTube upload (empty creds -> stub uploader is used instead)
  youtubeClientId: string;
  youtubeClientSecret: string;
  youtubeRefreshToken: string;
  youtubeDefaultVisibility: VideoVisibility;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const llmClient: LlmClientKind = env.LLM_CLIENT === "api" ? "api" : "claude-code";
  const visualSource: VisualSource = env.VISUAL_SOURCE === "ai" ? "ai" : "stock";
  const videoRenderer: VideoRenderer = env.VIDEO_RENDERER === "stub" ? "stub" : "ffmpeg";
  const youtubeDefaultVisibility: VideoVisibility =
    env.YOUTUBE_DEFAULT_VISIBILITY === "unlisted" || env.YOUTUBE_DEFAULT_VISIBILITY === "public"
      ? env.YOUTUBE_DEFAULT_VISIBILITY
      : "private";
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
    higgsfieldApiKey: env.HIGGSFIELD_API_KEY ?? "",
    higgsfieldApiSecret: env.HIGGSFIELD_API_SECRET ?? "",
    higgsfieldImageModel: env.HIGGSFIELD_IMAGE_MODEL ?? "flux-pro/kontext/max/text-to-image",
    higgsfieldAspect: env.HIGGSFIELD_ASPECT ?? "9:16",
    // Image-prompt template with a {SCENE} slot. Default = apocalypse-horror preset
    // (see packages/video/src/prompt-templates.ts and docs/prompting-templates.md).
    higgsfieldStyle:
      env.HIGGSFIELD_STYLE ??
      "cinematic film still. {SCENE}. post-apocalyptic horror atmosphere, desolate and eerie, " +
        "desaturated teal-and-amber grade, consistent volumetric lighting, god rays through haze, " +
        "deep low-key shadows, dramatic rim light, fog and drifting ash, shot on ARRI Alexa, " +
        "35mm anamorphic lens, f/2.0 shallow depth of field, Kodak Vision3 film grain, rule of thirds, " +
        "no text, no watermark, no on-screen captions",
    videoRenderer,
    youtubeClientId: env.YOUTUBE_CLIENT_ID ?? "",
    youtubeClientSecret: env.YOUTUBE_CLIENT_SECRET ?? "",
    youtubeRefreshToken: env.YOUTUBE_REFRESH_TOKEN ?? "",
    youtubeDefaultVisibility,
  };
}
