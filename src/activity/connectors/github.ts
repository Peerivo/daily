import type {
  ActivityConnector,
  ActivityFetchParams,
  NormalizedActivityItem,
} from "../types.js";

export type GitHubEventKind =
  | "pull_request"
  | "issue"
  | "check_run"
  | "workflow_run";

export interface GitHubActivityRecord {
  id: string;
  repository: string;
  kind: GitHubEventKind;
  title: string;
  url: string | null;
  actorName?: string | null;
  occurredAt: Date;
  state?: string | null;
  conclusion?: string | null;
  number?: number | null;
}

export interface GitHubActivityClient {
  fetchActivityRecords(params: {
    since: Date;
    until: Date;
    accountId: string;
  }): Promise<readonly GitHubActivityRecord[]>;
}

export class GitHubActivityConnector implements ActivityConnector {
  readonly source = "github" as const;

  constructor(
    private readonly client?: GitHubActivityClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async fetchActivities(
    params: ActivityFetchParams,
  ): Promise<NormalizedActivityItem[]> {
    if (!this.client) {
      throw new Error("GitHubActivityConnector requires a GitHubActivityClient");
    }

    const records = await this.client.fetchActivityRecords(params);
    return this.normalize(records, params.accountId);
  }

  normalize(
    records: readonly GitHubActivityRecord[],
    accountId: string,
  ): NormalizedActivityItem[] {
    const detectedAt = this.now();

    return records.map((record) => {
      const failed =
        record.conclusion === "failure" ||
        record.conclusion === "cancelled" ||
        record.conclusion === "timed_out";

      return {
        source: this.source,
        sourceAccountId: accountId,
        externalId: record.id,
        threadId:
          record.number == null
            ? null
            : `${record.repository}#${record.number}`,
        projectId: null,
        title: `[${record.repository}] ${record.title}`,
        summary: record.state ?? record.conclusion ?? null,
        rawText: null,
        url: record.url,
        actorName: record.actorName ?? null,
        actorEmail: null,
        activityType:
          record.kind === "issue"
            ? "issue"
            : record.kind === "pull_request"
              ? "pull_request"
              : "system_alert",
        status: failed ? "needs_action" : "new",
        priority: failed ? "high" : "medium",
        occurredAt: record.occurredAt,
        detectedAt,
        dueAt: null,
        metadata: {
          repository: record.repository,
          githubKind: record.kind,
          state: record.state ?? null,
          conclusion: record.conclusion ?? null,
          number: record.number ?? null,
        },
      };
    });
  }
}
