import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  GoogleCalendarActivityConnector,
  GoogleDriveActivityConnector,
  InMemoryActivityItemRepository,
  MockActivityConnector,
  renderDailyActivityDigest,
  runDailyActivityCheck,
  type NormalizedActivityItem,
} from "../src/index.js";

const since = new Date("2026-09-15T00:00:00.000Z");
const until = new Date("2026-09-16T00:00:00.000Z");
const detectedAt = new Date("2026-09-15T09:00:00.000Z");

function activity(
  overrides: Partial<NormalizedActivityItem> = {},
): NormalizedActivityItem {
  return {
    source: "gmail",
    sourceAccountId: "account-1",
    externalId: "message-1",
    threadId: null,
    projectId: null,
    title: "Daily update",
    summary: null,
    rawText: null,
    url: null,
    actorName: null,
    actorEmail: null,
    activityType: "email_message",
    status: "new",
    priority: "medium",
    occurredAt: new Date("2026-09-15T08:00:00.000Z"),
    detectedAt,
    dueAt: null,
    metadata: {},
    ...overrides,
  };
}

async function run(
  repository: InMemoryActivityItemRepository,
  activities: NormalizedActivityItem[],
) {
  return runDailyActivityCheck(
    { since, until, accountId: "account-1" },
    {
      connectors: [new MockActivityConnector("gmail", activities)],
      repository,
      now: () => detectedAt,
    },
  );
}

describe("daily activity layer", () => {
  it("saves activities returned by a mock connector", async () => {
    const repository = new InMemoryActivityItemRepository();

    const result = await run(repository, [activity()]);

    assert.equal(result.activities.length, 1);
    assert.equal(repository.all().length, 1);
    assert.equal(result.connectorCount, 1);
  });

  it("upserts a repeated external activity without creating duplicates", async () => {
    const repository = new InMemoryActivityItemRepository();
    const original = await run(repository, [activity({ title: "Original" })]);
    const updated = await run(repository, [activity({ title: "Updated" })]);

    assert.equal(repository.all().length, 1);
    assert.equal(repository.all()[0]?.title, "Updated");
    assert.equal(updated.activities[0]?.id, original.activities[0]?.id);
  });

  it("classifies invoice/payment keywords as invoice activities", async () => {
    const result = await run(new InMemoryActivityItemRepository(), [
      activity({ title: "Invoice payment due" }),
    ]);

    assert.equal(result.activities[0]?.activityType, "invoice");
    assert.equal(result.activities[0]?.projectId, "finance");
  });

  it("normalizes a calendar event as a meeting", () => {
    const item = new GoogleCalendarActivityConnector().normalize(
      {
        id: "event-1",
        title: "Planning",
        startsAt: new Date("2026-09-15T12:00:00.000Z"),
      },
      "account-1",
      detectedAt,
    );

    assert.equal(item.activityType, "meeting");
    assert.equal(item.source, "google_calendar");
  });

  it("normalizes a Drive comment as a document comment", () => {
    const item = new GoogleDriveActivityConnector().normalize(
      {
        id: "file-1",
        name: "Roadmap",
        modifiedAt: detectedAt,
        changeKind: "comment",
      },
      "account-1",
      detectedAt,
    );

    assert.equal(item.activityType, "document_comment");
  });

  it("maps project keywords to projectId", async () => {
    const result = await run(new InMemoryActivityItemRepository(), [
      activity({ title: "Peerivo network review" }),
    ]);

    assert.equal(result.activities[0]?.projectId, "peerivo");
  });

  it("groups activities into digest sections", async () => {
    const result = await runDailyActivityCheck(
      { since, until, accountId: "account-1" },
      {
        connectors: [
          new MockActivityConnector("gmail", [
            activity({
              externalId: "urgent-1",
              title: "Urgent Peerivo reply",
              status: "needs_action",
              priority: "urgent",
            }),
          ]),
          new MockActivityConnector("google_drive", [
            activity({
              externalId: "drive-1",
              source: "google_drive",
              title: "Mercy volunteer brief",
              activityType: "document_updated",
            }),
          ]),
        ],
        repository: new InMemoryActivityItemRepository(),
        now: () => detectedAt,
      },
    );

    assert.equal(result.digest.urgent.length, 1);
    assert.equal(result.digest.needsReply.length, 1);
    assert.equal(result.digest.drive.length, 1);
    assert.equal(result.digest.projects.peerivo.length, 1);
    assert.equal(result.digest.projects["mercy-platform"].length, 1);
    assert.match(renderDailyActivityDigest(result.digest), /# Daily Activity Digest/);
    assert.match(renderDailyActivityDigest(result.digest), /## Что сделать сегодня/);
  });
});
