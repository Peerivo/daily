import type { ProjectId, StoredActivityItem } from "./types.js";

const DIGEST_PROJECTS = [
  "peerivo",
  "mercy-platform",
  "ai-factory",
  "postbazar",
  "bitrix",
] as const satisfies readonly ProjectId[];

export type DigestProjectId = (typeof DIGEST_PROJECTS)[number];

export interface DailyActivityDigest {
  generatedAt: Date;
  urgent: StoredActivityItem[];
  needsReply: StoredActivityItem[];
  calendar: StoredActivityItem[];
  drive: StoredActivityItem[];
  projects: Record<DigestProjectId, StoredActivityItem[]>;
  financeDocuments: StoredActivityItem[];
  todayActions: StoredActivityItem[];
}

const priorityRank = { urgent: 0, high: 1, medium: 2, low: 3 } as const;

function sortActivities(items: StoredActivityItem[]): StoredActivityItem[] {
  return items.sort((left, right) => {
    const priorityDifference =
      priorityRank[left.priority] - priorityRank[right.priority];
    return priorityDifference || left.occurredAt.getTime() - right.occurredAt.getTime();
  });
}

function isActionable(item: StoredActivityItem): boolean {
  return item.status === "needs_action" || item.priority === "urgent";
}

export function buildDailyActivityDigest(
  items: readonly StoredActivityItem[],
  generatedAt = new Date(),
): DailyActivityDigest {
  const activeItems = items.filter(
    (item) => item.status !== "ignored" && item.status !== "done",
  );
  const projects = Object.fromEntries(
    DIGEST_PROJECTS.map((projectId) => [
      projectId,
      sortActivities(activeItems.filter((item) => item.projectId === projectId)),
    ]),
  ) as Record<DigestProjectId, StoredActivityItem[]>;

  return {
    generatedAt,
    urgent: sortActivities(
      activeItems.filter((item) => item.priority === "urgent"),
    ),
    needsReply: sortActivities(
      activeItems.filter(
        (item) =>
          item.source === "gmail" && item.status === "needs_action",
      ),
    ),
    calendar: sortActivities(
      activeItems.filter((item) => item.source === "google_calendar"),
    ),
    drive: sortActivities(
      activeItems.filter((item) => item.source === "google_drive"),
    ),
    projects,
    financeDocuments: sortActivities(
      activeItems.filter(
        (item) => item.projectId === "finance" || item.activityType === "invoice",
      ),
    ),
    todayActions: sortActivities(activeItems.filter(isActionable)),
  };
}

const PROJECT_LABELS: Record<DigestProjectId, string> = {
  peerivo: "Peerivo",
  "mercy-platform": "Mercy Platform",
  "ai-factory": "AI Factory",
  postbazar: "PostBazar",
  bitrix: "Bitrix",
};

function list(items: readonly StoredActivityItem[]): string {
  return items.length === 0
    ? "- Нет активностей"
    : items.map((item) => `- ${item.title}`).join("\n");
}

export function renderDailyActivityDigest(digest: DailyActivityDigest): string {
  const projectSections = DIGEST_PROJECTS.map(
    (projectId) =>
      `### ${PROJECT_LABELS[projectId]}\n${list(digest.projects[projectId])}`,
  ).join("\n\n");
  const actions =
    digest.todayActions.length === 0
      ? "1. Нет обязательных действий"
      : digest.todayActions
          .map((item, index) => `${index + 1}. ${item.title}`)
          .join("\n");

  return `# Daily Activity Digest

## Срочно
${list(digest.urgent)}

## Нужно ответить
${list(digest.needsReply)}

## Сегодня / календарь
${list(digest.calendar)}

## Документы / Drive
${list(digest.drive)}

## Проекты
${projectSections}

## Финансы / документы
${list(digest.financeDocuments)}

## Что сделать сегодня
${actions}`;
}
