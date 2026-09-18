import type { StoredActivityItem } from "../activity/types.js";
export interface KnowledgeContext { projectId: string; summary: string; facts: readonly string[]; }
export interface KnowledgeCandidate { activityId: string; projectId: string | null; title: string; summary: string | null; occurredAt: Date; evidenceUrl: string | null; }
export interface KnowledgePort {
  getProjectContext(projectId: string): Promise<KnowledgeContext | null>;
  submitCandidates(candidates: readonly KnowledgeCandidate[]): Promise<void>;
}
export function activityToKnowledgeCandidate(activity: StoredActivityItem): KnowledgeCandidate {
  return { activityId: activity.id, projectId: activity.projectId, title: activity.title, summary: activity.summary, occurredAt: activity.occurredAt, evidenceUrl: activity.url };
}
