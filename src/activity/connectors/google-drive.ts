import type {
  ActivityConnector,
  ActivityFetchParams,
  NormalizedActivityItem,
} from "../types.js";
import { GOOGLE_DRIVE_DISCOVERY_RULES } from "./rules.js";

export interface GoogleDriveActivityRecord {
  id: string;
  name: string;
  description?: string;
  webViewLink?: string;
  ownerName?: string;
  ownerEmail?: string;
  modifiedAt: Date;
  createdAt?: Date;
  changeKind?: "created" | "updated" | "comment";
  commentText?: string;
  mentionedUser?: boolean;
  parentFolderNames?: string[];
  metadata?: Record<string, unknown>;
}

export class GoogleDriveActivityConnector implements ActivityConnector {
  readonly source = "google_drive" as const;
  readonly discoveryRules = GOOGLE_DRIVE_DISCOVERY_RULES;

  async fetchActivities(
    _params: ActivityFetchParams,
  ): Promise<NormalizedActivityItem[]> {
    // API boundary for the next PR. It must use Drive metadata/read-only scopes.
    return Promise.resolve([]);
  }

  normalize(
    record: GoogleDriveActivityRecord,
    accountId: string,
    detectedAt = new Date(),
  ): NormalizedActivityItem {
    const activityType =
      record.changeKind === "comment"
        ? "document_comment"
        : record.changeKind === "updated"
          ? "document_updated"
          : "document";

    return {
      source: this.source,
      sourceAccountId: accountId,
      externalId: record.id,
      threadId: null,
      projectId: null,
      title: record.name,
      summary: record.commentText ?? record.description ?? null,
      rawText: null,
      url: record.webViewLink ?? null,
      actorName: record.ownerName ?? null,
      actorEmail: record.ownerEmail ?? null,
      activityType,
      status: record.mentionedUser ? "needs_action" : "new",
      priority: record.mentionedUser ? "high" : "medium",
      occurredAt: record.modifiedAt,
      detectedAt,
      dueAt: null,
      metadata: {
        createdAt: record.createdAt?.toISOString(),
        changeKind: record.changeKind ?? "created",
        mentionedUser: record.mentionedUser ?? false,
        parentFolderNames: record.parentFolderNames ?? [],
        ...record.metadata,
      },
    };
  }
}
