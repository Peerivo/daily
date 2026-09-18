import type {
  GitHubActivityClient,
  GitHubActivityRecord,
} from "./github.js";

export interface GitHubHttpResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

export type GitHubFetch = (
  url: string,
  init?: { headers?: Record<string, string> },
) => Promise<GitHubHttpResponse>;

export interface GitHubRestActivityClientOptions {
  repositories: readonly string[];
  token?: string;
  baseUrl?: string;
  fetchImpl?: GitHubFetch;
}

interface GitHubUserDto {
  login?: string | null;
}

interface GitHubPullDto {
  id: number;
  number: number;
  title: string;
  html_url: string;
  user?: GitHubUserDto | null;
  updated_at: string;
  state: string;
}

interface GitHubIssueDto extends GitHubPullDto {
  pull_request?: unknown;
}

interface GitHubWorkflowRunDto {
  id: number;
  name?: string | null;
  display_title?: string | null;
  html_url: string;
  actor?: GitHubUserDto | null;
  run_started_at?: string | null;
  updated_at: string;
  status?: string | null;
  conclusion?: string | null;
}

interface GitHubWorkflowRunsDto {
  workflow_runs?: GitHubWorkflowRunDto[];
}

function defaultFetch(
  url: string,
  init?: { headers?: Record<string, string> },
): Promise<GitHubHttpResponse> {
  return init?.headers === undefined
    ? fetch(url)
    : fetch(url, { headers: init.headers });
}

function parseRepository(repository: string): [string, string] {
  const [owner, name, ...rest] = repository.split("/");
  if (!owner || !name || rest.length > 0) {
    throw new TypeError(`Invalid GitHub repository: ${repository}`);
  }
  return [owner, name];
}

function inWindow(date: Date, since: Date, until: Date): boolean {
  return date >= since && date <= until;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export class GitHubRestActivityClient implements GitHubActivityClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: GitHubFetch;

  constructor(private readonly options: GitHubRestActivityClientOptions) {
    this.baseUrl = (options.baseUrl ?? "https://api.github.com").replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? defaultFetch;
  }

  async fetchActivityRecords(params: {
    since: Date;
    until: Date;
    accountId: string;
  }): Promise<readonly GitHubActivityRecord[]> {
    if (params.since > params.until) {
      throw new RangeError("since must be earlier than or equal to until");
    }

    for (const repository of this.options.repositories) {
      parseRepository(repository);
    }

    const batches = await Promise.all(
      this.options.repositories.map(async (repository) => {
        try {
          return await this.fetchRepository(
            repository,
            params.since,
            params.until,
          );
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : String(error);
          return [
            {
              id: `repository-error:${repository}:${params.until
                .toISOString()
                .slice(0, 10)}`,
              repository,
              kind: "check_run" as const,
              title: "GitHub ingestion failed",
              url: `https://github.com/${repository}`,
              occurredAt: params.until,
              state: message,
              conclusion: "failure",
              ingestionError: true,
            },
          ];
        }
      }),
    );

    return batches
      .flat()
      .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime());
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "peerivo-daily",
    };
    if (this.options.token) {
      headers.Authorization = `Bearer ${this.options.token}`;
    }
    return headers;
  }

  private async requestJson(path: string): Promise<unknown> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      headers: this.headers(),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `GitHub API request failed (${response.status}) for ${path}: ${body.slice(0, 300)}`,
      );
    }
    return response.json();
  }

  private async fetchRepository(
    repository: string,
    since: Date,
    until: Date,
  ): Promise<GitHubActivityRecord[]> {
    const [owner, name] = parseRepository(repository);
    const repoPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
    const sinceEncoded = encodeURIComponent(since.toISOString());

    const [pullsRaw, issuesRaw, workflowsRaw] = await Promise.all([
      this.requestJson(
        `${repoPath}/pulls?state=all&sort=updated&direction=desc&per_page=100`,
      ),
      this.requestJson(
        `${repoPath}/issues?state=all&sort=updated&direction=desc&since=${sinceEncoded}&per_page=100`,
      ),
      this.requestJson(`${repoPath}/actions/runs?per_page=100`),
    ]);

    const pulls = asArray<GitHubPullDto>(pullsRaw)
      .map((pull): GitHubActivityRecord => ({
        id: `pr:${repository}:${pull.id}`,
        repository,
        kind: "pull_request",
        title: `PR #${pull.number}: ${pull.title}`,
        url: pull.html_url,
        actorName: pull.user?.login ?? null,
        occurredAt: new Date(pull.updated_at),
        state: pull.state,
        number: pull.number,
      }))
      .filter((item) => inWindow(item.occurredAt, since, until));

    const issues = asArray<GitHubIssueDto>(issuesRaw)
      .filter((issue) => issue.pull_request === undefined)
      .map((issue): GitHubActivityRecord => ({
        id: `issue:${repository}:${issue.id}`,
        repository,
        kind: "issue",
        title: `Issue #${issue.number}: ${issue.title}`,
        url: issue.html_url,
        actorName: issue.user?.login ?? null,
        occurredAt: new Date(issue.updated_at),
        state: issue.state,
        number: issue.number,
      }))
      .filter((item) => inWindow(item.occurredAt, since, until));

    const workflowRuns = asArray<GitHubWorkflowRunDto>(
      (workflowsRaw as GitHubWorkflowRunsDto | null)?.workflow_runs,
    )
      .map((run): GitHubActivityRecord => ({
        id: `workflow:${repository}:${run.id}`,
        repository,
        kind: "workflow_run",
        title: run.display_title ?? run.name ?? `Workflow #${run.id}`,
        url: run.html_url,
        actorName: run.actor?.login ?? null,
        occurredAt: new Date(run.updated_at ?? run.run_started_at ?? until),
        state: run.status ?? null,
        conclusion: run.conclusion ?? null,
      }))
      .filter((item) => inWindow(item.occurredAt, since, until));

    return [...pulls, ...issues, ...workflowRuns];
  }
}
