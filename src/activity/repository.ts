import type { NormalizedActivityItem, StoredActivityItem } from "./types.js";

export interface ActivityItemRepository {
  upsertMany(items: readonly NormalizedActivityItem[]): Promise<StoredActivityItem[]>;
}

function uniqueKey(item: NormalizedActivityItem): string {
  return JSON.stringify([item.source, item.sourceAccountId, item.externalId]);
}

function cloneStoredItem(item: StoredActivityItem): StoredActivityItem {
  return {
    ...item,
    occurredAt: new Date(item.occurredAt),
    detectedAt: new Date(item.detectedAt),
    dueAt: item.dueAt === null ? null : new Date(item.dueAt),
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
    metadata: structuredClone(item.metadata),
  };
}

export class InMemoryActivityItemRepository implements ActivityItemRepository {
  private readonly items = new Map<string, StoredActivityItem>();
  private sequence = 0;

  async upsertMany(
    items: readonly NormalizedActivityItem[],
  ): Promise<StoredActivityItem[]> {
    const stored: StoredActivityItem[] = [];

    for (const item of items) {
      const key = uniqueKey(item);
      const existing = this.items.get(key);
      const now = new Date();
      const next: StoredActivityItem = {
        ...item,
        metadata: structuredClone(item.metadata),
        id: existing?.id ?? `activity-${++this.sequence}`,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      this.items.set(key, next);
      stored.push(cloneStoredItem(next));
    }

    return Promise.resolve(stored);
  }

  all(): StoredActivityItem[] {
    return [...this.items.values()].map(cloneStoredItem);
  }
}

export interface SqlQueryResult<Row> {
  rows: Row[];
}

export interface SqlClient {
  query<Row extends Record<string, unknown>>(
    sql: string,
    values: readonly unknown[],
  ): Promise<SqlQueryResult<Row>>;
}

interface ActivityItemRow extends Record<string, unknown> {
  id: string;
  source: StoredActivityItem["source"];
  source_account_id: string;
  external_id: string;
  thread_id: string | null;
  project_id: StoredActivityItem["projectId"];
  title: string;
  summary: string | null;
  raw_text: string | null;
  url: string | null;
  actor_name: string | null;
  actor_email: string | null;
  activity_type: StoredActivityItem["activityType"];
  status: StoredActivityItem["status"];
  priority: StoredActivityItem["priority"];
  occurred_at: Date | string;
  detected_at: Date | string;
  due_at: Date | string | null;
  metadata: StoredActivityItem["metadata"];
  created_at: Date | string;
  updated_at: Date | string;
}

const UPSERT_ACTIVITY_SQL = `
INSERT INTO activity_items (
  source, source_account_id, external_id, thread_id, project_id,
  title, summary, raw_text, url, actor_name, actor_email,
  activity_type, status, priority, occurred_at, detected_at, due_at, metadata
) VALUES (
  $1, $2, $3, $4, $5,
  $6, $7, $8, $9, $10, $11,
  $12, $13, $14, $15, $16, $17, $18::jsonb
)
ON CONFLICT (source, source_account_id, external_id)
DO UPDATE SET
  thread_id = EXCLUDED.thread_id,
  project_id = EXCLUDED.project_id,
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  raw_text = EXCLUDED.raw_text,
  url = EXCLUDED.url,
  actor_name = EXCLUDED.actor_name,
  actor_email = EXCLUDED.actor_email,
  activity_type = EXCLUDED.activity_type,
  status = EXCLUDED.status,
  priority = EXCLUDED.priority,
  occurred_at = EXCLUDED.occurred_at,
  detected_at = EXCLUDED.detected_at,
  due_at = EXCLUDED.due_at,
  metadata = EXCLUDED.metadata,
  updated_at = now()
RETURNING *`;

export class PostgresActivityItemRepository implements ActivityItemRepository {
  constructor(private readonly client: SqlClient) {}

  async upsertMany(
    items: readonly NormalizedActivityItem[],
  ): Promise<StoredActivityItem[]> {
    return Promise.all(
      items.map(async (item) => {
        const result = await this.client.query<ActivityItemRow>(
          UPSERT_ACTIVITY_SQL,
          [
            item.source,
            item.sourceAccountId,
            item.externalId,
            item.threadId,
            item.projectId,
            item.title,
            item.summary,
            item.rawText,
            item.url,
            item.actorName,
            item.actorEmail,
            item.activityType,
            item.status,
            item.priority,
            item.occurredAt,
            item.detectedAt,
            item.dueAt,
            JSON.stringify(item.metadata),
          ],
        );
        const row = result.rows[0];
        if (row === undefined) {
          throw new Error("Activity upsert did not return a row");
        }
        return mapActivityRow(row);
      }),
    );
  }
}

function mapActivityRow(row: ActivityItemRow): StoredActivityItem {
  return {
    id: row.id,
    source: row.source,
    sourceAccountId: row.source_account_id,
    externalId: row.external_id,
    threadId: row.thread_id,
    projectId: row.project_id,
    title: row.title,
    summary: row.summary,
    rawText: row.raw_text,
    url: row.url,
    actorName: row.actor_name,
    actorEmail: row.actor_email,
    activityType: row.activity_type,
    status: row.status,
    priority: row.priority,
    occurredAt: new Date(row.occurred_at),
    detectedAt: new Date(row.detected_at),
    dueAt: row.due_at === null ? null : new Date(row.due_at),
    metadata: row.metadata,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}
