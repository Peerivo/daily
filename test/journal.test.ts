import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createDailyJournalTemplate,
  DAILY_PROJECT_REGISTRY,
  findStaleProjects,
  renderDailyJournal,
  summarizeProjectActivity,
  type DailyProjectDefinition,
  type StoredActivityItem,
} from "../src/index.js";

const generatedAt = new Date("2026-09-17T09:00:00.000Z");
const journalDate = new Date("2026-09-17T00:00:00.000Z");

function storedActivity(
  overrides: Partial<StoredActivityItem> = {},
): StoredActivityItem {
  const occurredAt = new Date("2026-09-17T08:00:00.000Z");
  return {
    id: "activity-1",
    source: "github",
    sourceAccountId: "account-1",
    externalId: "event-1",
    threadId: null,
    projectId: null,
    title: "Daily Activity Layer PR updated",
    summary: null,
    rawText: null,
    url: null,
    actorName: null,
    actorEmail: null,
    activityType: "pull_request",
    status: "new",
    priority: "medium",
    occurredAt,
    detectedAt: generatedAt,
    dueAt: null,
    metadata: {},
    createdAt: occurredAt,
    updatedAt: occurredAt,
    ...overrides,
  };
}

describe("daily journal", () => {
  it("keeps a canonical project registry large enough for the current workspace", () => {
    assert.ok(DAILY_PROJECT_REGISTRY.length >= 22);
    assert.ok(DAILY_PROJECT_REGISTRY.some((project) => project.id === "daily"));
    assert.ok(
      DAILY_PROJECT_REGISTRY.some(
        (project) => project.repo === "Peerivo/publisher",
      ),
    );
  });

  it("detects stale projects from their target cadence", () => {
    const projects: readonly DailyProjectDefinition[] = [
      {
        id: "fast-project",
        title: "Fast Project",
        group: "peerivo-core",
        priority: "critical",
        cadenceDays: 1,
        activityProjectId: null,
        repo: null,
        keywords: ["fast project"],
        notes: null,
      },
    ];
    const activities = [
      storedActivity({
        title: "Fast Project checkpoint",
        occurredAt: new Date("2026-09-14T08:00:00.000Z"),
      }),
    ];

    const stale = findStaleProjects(activities, projects, journalDate);

    assert.equal(stale.length, 1);
    assert.equal(stale[0]?.project.id, "fast-project");
    assert.equal(stale[0]?.status, "stale");
  });

  it("marks projects with same-day matching activity as active", () => {
    const summaries = summarizeProjectActivity(
      [storedActivity({ title: "Peerivo/daily journal implementation" })],
      DAILY_PROJECT_REGISTRY.filter((project) => project.id === "daily"),
      journalDate,
    );

    assert.equal(summaries[0]?.status, "active");
    assert.equal(summaries[0]?.isStale, false);
  });

  it("does not smear one precise GitHub repository across broad Peerivo projects", () => {
    const projects = DAILY_PROJECT_REGISTRY.filter((project) =>
      ["peerivo-network", "peerivo-publisher", "peerivo-marketing"].includes(
        project.id,
      ),
    );
    const summaries = summarizeProjectActivity(
      [
        storedActivity({
          projectId: "peerivo",
          title: "[Peerivo/network] PR #42: Network change",
          metadata: { repository: "Peerivo/network" },
        }),
      ],
      projects,
      journalDate,
    );

    assert.equal(
      summaries.find((summary) => summary.project.id === "peerivo-network")
        ?.activityCount,
      1,
    );
    assert.equal(
      summaries.find((summary) => summary.project.id === "peerivo-publisher")
        ?.activityCount,
      0,
    );
    assert.equal(
      summaries.find((summary) => summary.project.id === "peerivo-marketing")
        ?.activityCount,
      0,
    );
  });

  it("treats a known GitHub repository as authoritative over generic keywords", () => {
    const summaries = summarizeProjectActivity(
      [
        storedActivity({
          title: "[Peerivo/daily] PR #7: Improve project report",
          metadata: { repository: "Peerivo/daily" },
        }),
      ],
      DAILY_PROJECT_REGISTRY,
      journalDate,
    );

    assert.equal(
      summaries.find((summary) => summary.project.id === "daily")
        ?.activityCount,
      1,
    );
    assert.equal(
      summaries.find((summary) => summary.project.id === "ai-factory")
        ?.activityCount,
      0,
    );
    assert.equal(
      summaries.find((summary) => summary.project.id === "people-os")
        ?.activityCount,
      0,
    );
  });

  it("surfaces ingestion failures without counting them as project movement", () => {
    const ingestionFailure = storedActivity({
      title: "[Peerivo/publisher] GitHub ingestion failed",
      activityType: "system_alert",
      status: "needs_action",
      priority: "high",
      metadata: {
        repository: "Peerivo/publisher",
        ingestionError: true,
      },
    });

    const [summary] = summarizeProjectActivity(
      [ingestionFailure],
      DAILY_PROJECT_REGISTRY.filter(
        (project) => project.id === "peerivo-publisher",
      ),
      journalDate,
    );
    assert.equal(summary?.activityCount, 0);
    assert.equal(summary?.status, "never_seen");

    const markdown = renderDailyJournal({
      date: journalDate,
      generatedAt,
      items: [ingestionFailure],
    });
    assert.match(markdown, /## Требует внимания/);
    assert.match(markdown, /GitHub ingestion failed/);
  });

  it("renders a daily journal from activity items", () => {
    const markdown = renderDailyJournal({
      date: journalDate,
      generatedAt,
      items: [
        storedActivity({
          title: "Urgent Peerivo reply",
          source: "gmail",
          projectId: "peerivo",
          status: "needs_action",
          priority: "urgent",
        }),
        storedActivity({
          id: "activity-2",
          externalId: "invoice-1",
          title: "Invoice payment due",
          activityType: "invoice",
          projectId: "finance",
        }),
      ],
      completed: ["Reviewed Daily Activity Layer scope"],
      tomorrow: ["Implement one small Daily increment"],
    });

    assert.match(markdown, /# Daily — 2026-09-17/);
    assert.match(markdown, /## Что сделал сегодня/);
    assert.match(markdown, /Urgent Peerivo reply/);
    assert.match(markdown, /Invoice payment due/);
    assert.match(markdown, /## Проекты без движения/);
    assert.match(markdown, /Implement one small Daily increment/);
  });

  it("renders a blank manual journal template", () => {
    const markdown = createDailyJournalTemplate(journalDate);

    assert.match(markdown, /# Daily — 2026-09-17/);
    assert.match(markdown, /## Кто ответил \/ кому надо ответить/);
    assert.match(markdown, /## Что давно не делал/);
  });
});
