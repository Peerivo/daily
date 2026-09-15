import { classifyActivity } from "./classification.js";
import { buildDailyActivityDigest, type DailyActivityDigest } from "./digest.js";
import type { ActivityItemRepository } from "./repository.js";
import type {
  ActivityConnector,
  ActivityFetchParams,
  StoredActivityItem,
} from "./types.js";

export interface DailyActivityCheckDependencies {
  connectors: readonly ActivityConnector[];
  repository: ActivityItemRepository;
  now?: () => Date;
}

export interface DailyActivityCheckResult {
  activities: StoredActivityItem[];
  digest: DailyActivityDigest;
  connectorCount: number;
}

export async function runDailyActivityCheck(
  params: ActivityFetchParams,
  dependencies: DailyActivityCheckDependencies,
): Promise<DailyActivityCheckResult> {
  if (params.since > params.until) {
    throw new RangeError("since must be earlier than or equal to until");
  }
  if (params.accountId.trim() === "") {
    throw new TypeError("accountId must not be empty");
  }

  const sources = dependencies.connectors.map((connector) => connector.source);
  if (new Set(sources).size !== sources.length) {
    throw new Error("Only one active connector per source is allowed");
  }

  const batches = await Promise.all(
    dependencies.connectors.map((connector) => connector.fetchActivities(params)),
  );
  const normalized = batches.flat().map(classifyActivity);
  const activities = await dependencies.repository.upsertMany(normalized);
  const generatedAt = dependencies.now?.() ?? new Date();

  return {
    activities,
    digest: buildDailyActivityDigest(activities, generatedAt),
    connectorCount: dependencies.connectors.length,
  };
}
