import {
  readInboxTopics,
  writeApprovedTopics,
  type TrendScorer,
  type WorkspaceLayout,
} from "@autosocial/core";

export interface TopicScoringDeps {
  scorer: TrendScorer;
  layout: WorkspaceLayout;
  limit: number;
}

export interface TopicScoringSummary {
  read: number; // raw topics found in the inbox
  approved: number; // topics written to the queue
}

// Cowork Automation 1 entrypoint: read inbox/topics, score, write approved to the queue.
export async function runTopicScoring(deps: TopicScoringDeps): Promise<TopicScoringSummary> {
  const topics = await readInboxTopics(deps.layout);
  const scored = await deps.scorer.score(topics, deps.limit);
  const approved = scored.filter((t) => t.approved);
  await writeApprovedTopics(deps.layout, approved);
  return { read: topics.length, approved: approved.length };
}
