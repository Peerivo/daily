export const ACTIVITY_SOURCES = [
  "gmail",
  "google_calendar",
  "google_drive",
  "github",
  "vercel",
  "supabase",
  "telegram",
  "crm",
] as const;

export type ActivitySource = (typeof ACTIVITY_SOURCES)[number];

export const ACTIVITY_TYPES = [
  "email_message",
  "email_reply",
  "email_attachment",
  "invoice",
  "document",
  "document_comment",
  "document_updated",
  "meeting",
  "deadline",
  "deploy",
  "issue",
  "pull_request",
  "system_alert",
  "task",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_STATUSES = [
  "new",
  "seen",
  "needs_action",
  "ignored",
  "done",
] as const;

export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];

export const ACTIVITY_PRIORITIES = [
  "low",
  "medium",
  "high",
  "urgent",
] as const;

export type ActivityPriority = (typeof ACTIVITY_PRIORITIES)[number];

export const PROJECT_IDS = [
  "peerivo",
  "mercy-platform",
  "ai-factory",
  "postbazar",
  "bitrix",
  "finance",
  "personal",
] as const;

export type ProjectId = (typeof PROJECT_IDS)[number];
export type ActivityMetadata = Record<string, unknown>;

export interface NormalizedActivityItem {
  source: ActivitySource;
  sourceAccountId: string;
  externalId: string;
  threadId: string | null;
  projectId: ProjectId | null;
  title: string;
  summary: string | null;
  rawText: string | null;
  url: string | null;
  actorName: string | null;
  actorEmail: string | null;
  activityType: ActivityType;
  status: ActivityStatus;
  priority: ActivityPriority;
  occurredAt: Date;
  detectedAt: Date;
  dueAt: Date | null;
  metadata: ActivityMetadata;
}

export interface StoredActivityItem extends NormalizedActivityItem {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivityConnector {
  source: ActivitySource;

  fetchActivities(params: {
    since: Date;
    until: Date;
    accountId: string;
  }): Promise<NormalizedActivityItem[]>;
}

export type ActivityFetchParams = Parameters<
  ActivityConnector["fetchActivities"]
>[0];
