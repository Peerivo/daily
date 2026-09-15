import type {
  ActivityConnector,
  ActivityFetchParams,
  NormalizedActivityItem,
} from "../types.js";
import { GMAIL_DISCOVERY_RULES } from "./rules.js";

export interface GmailActivityRecord {
  id: string;
  threadId?: string;
  subject: string;
  snippet?: string;
  plainText?: string;
  webUrl?: string;
  fromName?: string;
  fromEmail?: string;
  receivedAt: Date;
  unread?: boolean;
  isReply?: boolean;
  hasAttachments?: boolean;
  needsReply?: boolean;
  important?: boolean;
  metadata?: Record<string, unknown>;
}

export class GmailActivityConnector implements ActivityConnector {
  readonly source = "gmail" as const;
  readonly discoveryRules = GMAIL_DISCOVERY_RULES;

  async fetchActivities(
    _params: ActivityFetchParams,
  ): Promise<NormalizedActivityItem[]> {
    // API boundary for the next PR. It must use Gmail read-only scopes.
    return Promise.resolve([]);
  }

  normalize(
    record: GmailActivityRecord,
    accountId: string,
    detectedAt = new Date(),
  ): NormalizedActivityItem {
    const activityType = record.hasAttachments
      ? "email_attachment"
      : record.isReply
        ? "email_reply"
        : "email_message";

    return {
      source: this.source,
      sourceAccountId: accountId,
      externalId: record.id,
      threadId: record.threadId ?? null,
      projectId: null,
      title: record.subject,
      summary: record.snippet ?? null,
      rawText: record.plainText ?? null,
      url: record.webUrl ?? null,
      actorName: record.fromName ?? null,
      actorEmail: record.fromEmail ?? null,
      activityType,
      status: record.needsReply ? "needs_action" : "new",
      priority: record.important ? "high" : "medium",
      occurredAt: record.receivedAt,
      detectedAt,
      dueAt: null,
      metadata: {
        unread: record.unread ?? false,
        hasAttachments: record.hasAttachments ?? false,
        needsReply: record.needsReply ?? false,
        important: record.important ?? false,
        ...record.metadata,
      },
    };
  }
}
