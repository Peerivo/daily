import type {
  ActivityConnector,
  ActivityFetchParams,
  ActivitySource,
  NormalizedActivityItem,
} from "../types.js";

type MockActivityFactory = (
  params: ActivityFetchParams,
) => NormalizedActivityItem[] | Promise<NormalizedActivityItem[]>;

export class MockActivityConnector implements ActivityConnector {
  constructor(
    readonly source: ActivitySource,
    private readonly activities: NormalizedActivityItem[] | MockActivityFactory,
  ) {}

  async fetchActivities(
    params: ActivityFetchParams,
  ): Promise<NormalizedActivityItem[]> {
    const items =
      typeof this.activities === "function"
        ? await this.activities(params)
        : this.activities;

    return items
      .filter(
        (item) =>
          item.occurredAt >= params.since && item.occurredAt <= params.until,
      )
      .map((item) => ({
        ...item,
        source: this.source,
        sourceAccountId: params.accountId,
      }));
  }
}
