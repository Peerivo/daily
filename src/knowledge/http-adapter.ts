import type {
  KnowledgeCandidate,
  KnowledgeContext,
  KnowledgePort,
} from "./port.js";

export interface KnowledgeHttpResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

export type KnowledgeFetch = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
) => Promise<KnowledgeHttpResponse>;

export interface HttpKnowledgePortOptions {
  baseUrl: string;
  token?: string;
  fetchImpl?: KnowledgeFetch;
}

interface KnowledgeContextDto {
  projectId?: unknown;
  summary?: unknown;
  facts?: unknown;
}

function defaultFetch(
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
): Promise<KnowledgeHttpResponse> {
  const requestInit: RequestInit = {};
  if (init?.method !== undefined) requestInit.method = init.method;
  if (init?.headers !== undefined) requestInit.headers = init.headers;
  if (init?.body !== undefined) requestInit.body = init.body;
  return fetch(url, requestInit);
}

function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/$/, "");
  if (!trimmed) throw new TypeError("Knowledge baseUrl must not be empty");
  return trimmed;
}

function serializeCandidate(candidate: KnowledgeCandidate) {
  return {
    activityId: candidate.activityId,
    projectIds: candidate.projectIds,
    title: candidate.title,
    summary: candidate.summary,
    occurredAt: candidate.occurredAt.toISOString(),
    evidenceUrl: candidate.evidenceUrl,
  };
}

function parseContext(value: unknown): KnowledgeContext {
  const dto = value as KnowledgeContextDto | null;
  if (
    dto === null ||
    typeof dto !== "object" ||
    typeof dto.projectId !== "string" ||
    typeof dto.summary !== "string" ||
    !Array.isArray(dto.facts) ||
    !dto.facts.every((fact) => typeof fact === "string")
  ) {
    throw new TypeError("Knowledge returned an invalid project context payload");
  }

  return {
    projectId: dto.projectId,
    summary: dto.summary,
    facts: dto.facts,
  };
}

export class HttpKnowledgePort implements KnowledgePort {
  private readonly baseUrl: string;
  private readonly fetchImpl: KnowledgeFetch;

  constructor(private readonly options: HttpKnowledgePortOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.fetchImpl = options.fetchImpl ?? defaultFetch;
  }

  async getProjectContext(projectId: string): Promise<KnowledgeContext | null> {
    const response = await this.fetchImpl(
      `${this.baseUrl}/v1/projects/${encodeURIComponent(projectId)}/context?consumer=daily`,
      { headers: this.headers() },
    );

    if (response.status === 404) return null;
    await this.ensureSuccess(response, "read project context");
    return parseContext(await response.json());
  }

  async submitCandidates(
    candidates: readonly KnowledgeCandidate[],
  ): Promise<void> {
    if (candidates.length === 0) return;

    const response = await this.fetchImpl(
      `${this.baseUrl}/v1/daily/candidates`,
      {
        method: "POST",
        headers: {
          ...this.headers(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "daily",
          candidates: candidates.map(serializeCandidate),
        }),
      },
    );

    await this.ensureSuccess(response, "submit knowledge candidates");
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": "peerivo-daily",
    };
    if (this.options.token) {
      headers.Authorization = `Bearer ${this.options.token}`;
    }
    return headers;
  }

  private async ensureSuccess(
    response: KnowledgeHttpResponse,
    operation: string,
  ): Promise<void> {
    if (response.ok) return;
    const body = await response.text();
    throw new Error(
      `Knowledge request failed while trying to ${operation} (${response.status}): ${body.slice(0, 300)}`,
    );
  }
}
