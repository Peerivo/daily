import type { NormalizedActivityItem } from "../types.js";
export type GitHubEventKind = "pull_request" | "issue" | "check_run" | "workflow_run";
export interface GitHubActivityRecord { id: string; repository: string; kind: GitHubEventKind; title: string; url: string | null; actorName?: string | null; occurredAt: Date; state?: string | null; conclusion?: string | null; number?: number | null; }
export class GitHubActivityConnector {
  readonly source = "github" as const;
  normalize(records: readonly GitHubActivityRecord[], accountId: string): NormalizedActivityItem[] {
    return records.map((record) => {
      const failed = record.conclusion === "failure" || record.conclusion === "cancelled" || record.conclusion === "timed_out";
      return {
        source: this.source, sourceAccountId: accountId, externalId: record.id,
        threadId: record.number ? `${record.repository}#${record.number}` : null,
        projectId: null, title: `[${record.repository}] ${record.title}`,
        summary: record.state ?? record.conclusion ?? null, rawText: null, url: record.url,
        actorName: record.actorName ?? null, actorEmail: null,
        activityType: record.kind === "issue" ? "issue" : record.kind === "pull_request" ? "pull_request" : "status_change",
        status: failed ? "needs_action" : "new", priority: failed ? "high" : "medium",
        occurredAt: record.occurredAt, dueAt: null,
        metadata: { repository: record.repository, githubKind: record.kind, state: record.state ?? null, conclusion: record.conclusion ?? null, number: record.number ?? null },
      };
    });
  }
}
