import { findDailyProjectsForActivity } from "../activity/project-registry.js";
import type { StoredActivityItem } from "../activity/types.js";

export interface KnowledgeContext {
  projectId: string;
  summary: string;
  facts: readonly string[];
}

export interface KnowledgeCandidate {
  activityId: string;
  projectIds: readonly string[];
  title: string;
  summary: string | null;
  occurredAt: Date;
  evidenceUrl: string | null;
}

export interface KnowledgePort {
  getProjectContext(projectId: string): Promise<KnowledgeContext | null>;
  submitCandidates(candidates: readonly KnowledgeCandidate[]): Promise<void>;
}

export function activityToKnowledgeCandidate(
  activity: StoredActivityItem,
): KnowledgeCandidate {
  return {
    activityId: activity.id,
    projectIds: findDailyProjectsForActivity(activity).map((project) => project.id),
    title: activity.title,
    summary: activity.summary,
    occurredAt: activity.occurredAt,
    evidenceUrl: activity.url,
  };
}
