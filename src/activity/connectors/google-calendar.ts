import type {
  ActivityConnector,
  ActivityFetchParams,
  NormalizedActivityItem,
} from "../types.js";
import { GOOGLE_CALENDAR_DISCOVERY_RULES } from "./rules.js";

export interface GoogleCalendarActivityRecord {
  id: string;
  title: string;
  description?: string;
  htmlLink?: string;
  organizerName?: string;
  organizerEmail?: string;
  startsAt: Date;
  endsAt?: Date;
  updatedAt?: Date;
  dueAt?: Date;
  isDeadline?: boolean;
  responseStatus?: "accepted" | "declined" | "needsAction" | "tentative";
  metadata?: Record<string, unknown>;
}

export class GoogleCalendarActivityConnector implements ActivityConnector {
  readonly source = "google_calendar" as const;
  readonly discoveryRules = GOOGLE_CALENDAR_DISCOVERY_RULES;

  async fetchActivities(
    _params: ActivityFetchParams,
  ): Promise<NormalizedActivityItem[]> {
    // API boundary for the next PR. It must use Calendar read-only scopes.
    return Promise.resolve([]);
  }

  normalize(
    record: GoogleCalendarActivityRecord,
    accountId: string,
    detectedAt = new Date(),
  ): NormalizedActivityItem {
    return {
      source: this.source,
      sourceAccountId: accountId,
      externalId: record.id,
      threadId: null,
      projectId: null,
      title: record.title,
      summary: record.description ?? null,
      rawText: null,
      url: record.htmlLink ?? null,
      actorName: record.organizerName ?? null,
      actorEmail: record.organizerEmail ?? null,
      activityType: record.isDeadline ? "deadline" : "meeting",
      status:
        record.responseStatus === "needsAction" ? "needs_action" : "new",
      priority: record.isDeadline ? "high" : "medium",
      occurredAt: record.updatedAt ?? record.startsAt,
      detectedAt,
      dueAt: record.dueAt ?? (record.isDeadline ? record.startsAt : null),
      metadata: {
        startsAt: record.startsAt.toISOString(),
        endsAt: record.endsAt?.toISOString(),
        responseStatus: record.responseStatus,
        ...record.metadata,
      },
    };
  }
}
