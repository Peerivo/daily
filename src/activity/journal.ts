import {
  buildDailyActivityDigest,
  type DailyActivityDigest,
} from "./digest.js";
import {
  DAILY_PROJECT_REGISTRY,
  findStaleProjects,
  summarizeProjectActivity,
  type DailyProjectDefinition,
  type ProjectActivitySummary,
} from "./project-registry.js";
import type { StoredActivityItem } from "./types.js";

export interface DailyJournalInput {
  date: Date;
  generatedAt?: Date;
  items?: readonly StoredActivityItem[];
  digest?: DailyActivityDigest;
  projects?: readonly DailyProjectDefinition[];
  completed?: readonly string[];
  notes?: readonly string[];
  tomorrow?: readonly string[];
  knowledgeContext?: readonly string[];
}

export interface DailyJournalModel {
  date: Date;
  generatedAt: Date;
  digest: DailyActivityDigest;
  projectSummaries: ProjectActivitySummary[];
  staleProjects: ProjectActivitySummary[];
  completed: readonly string[];
  notes: readonly string[];
  tomorrow: readonly string[];
  knowledgeContext: readonly string[];
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDateTime(date: Date): string {
  return date.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

function renderBulletList(items: readonly string[], emptyText: string): string {
  return items.length === 0
    ? `- ${emptyText}`
    : items.map((item) => `- ${item}`).join("\n");
}

function renderActivityList(
  items: readonly StoredActivityItem[],
  emptyText: string,
): string {
  return items.length === 0
    ? `- ${emptyText}`
    : items
        .map((item) => {
          const project = item.projectId === null ? "без проекта" : item.projectId;
          return `- ${item.title} _(${project}, ${item.source})_`;
        })
        .join("\n");
}

function renderProjectProgress(projects: readonly ProjectActivitySummary[]): string {
  const activeProjects = projects.filter((summary) => !summary.isStale);

  return activeProjects.length === 0
    ? "- Нет свежих движений по проектам"
    : activeProjects
        .map((summary) => {
          const days = summary.daysSinceActivity ?? 0;
          return `- ${summary.project.title}: ${summary.activityCount} активн., последнее движение ${days} дн. назад`;
        })
        .join("\n");
}

function renderStaleProjects(projects: readonly ProjectActivitySummary[]): string {
  return projects.length === 0
    ? "- Нет просроченных проектов"
    : projects
        .slice(0, 10)
        .map((summary) => {
          const age =
            summary.daysSinceActivity === null
              ? "ещё не было активности"
              : `${summary.daysSinceActivity} дн. без движения`;
          return `- ${summary.project.title}: ${age}; целевой ритм — ${summary.project.cadenceDays} дн.`;
        })
        .join("\n");
}

function renderTomorrowList(items: readonly string[]): string {
  return items.length === 0
    ? "1. Выбрать один главный проект дня\n2. Закрыть один зависший follow-up\n3. Зафиксировать итог в Daily"
    : items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

export function buildDailyJournalModel(input: DailyJournalInput): DailyJournalModel {
  const items = input.items ?? [];
  const generatedAt = input.generatedAt ?? new Date();
  const digest = input.digest ?? buildDailyActivityDigest(items, generatedAt);
  const projects = input.projects ?? DAILY_PROJECT_REGISTRY;
  const projectSummaries = summarizeProjectActivity(items, projects, input.date);

  return {
    date: input.date,
    generatedAt,
    digest,
    projectSummaries,
    staleProjects: findStaleProjects(items, projects, input.date),
    completed: input.completed ?? [],
    notes: input.notes ?? [],
    tomorrow: input.tomorrow ?? [],
    knowledgeContext: input.knowledgeContext ?? [],
  };
}

export function renderDailyJournal(input: DailyJournalInput): string {
  const model = buildDailyJournalModel(input);

  return `# Daily — ${formatDate(model.date)}

_Generated at ${formatDateTime(model.generatedAt)}_

## Что сделал сегодня
${renderBulletList(model.completed, "Заполнить вручную")}

## Срочно
${renderActivityList(model.digest.urgent, "Нет срочного")}

## Требует внимания
${renderActivityList(
  model.digest.todayActions.filter(
    (item) =>
      item.priority !== "urgent" &&
      !(item.source === "gmail" && item.status === "needs_action"),
  ),
  "Нет дополнительных действий",
)}

## Нужно ответить
${renderActivityList(model.digest.needsReply, "Нет обязательных ответов")}

## Что двинулось по проектам
${renderProjectProgress(model.projectSummaries)}

## Проекты без движения
${renderStaleProjects(model.staleProjects)}

## Календарь / встречи
${renderActivityList(model.digest.calendar, "Нет встреч в выборке")}

## Документы / Drive
${renderActivityList(model.digest.drive, "Нет обновлений документов")}

## Деньги / счета / документы
${renderActivityList(model.digest.financeDocuments, "Нет финансовых документов")}

## Что сделать завтра
${renderTomorrowList(model.tomorrow)}

## Контекст Knowledge
${renderBulletList(model.knowledgeContext, "Knowledge пока не подключён")}

## Заметки
${renderBulletList(model.notes, "Нет заметок")}`;
}

export function createDailyJournalTemplate(date = new Date()): string {
  return `# Daily — ${formatDate(date)}

## Что сделал сегодня
- 

## Что двинулось по проектам
- 

## Кто ответил / кому надо ответить
- 

## Деньги / счета / документы
- 

## Что давно не делал
- 

## Что сделать завтра
1. 
2. 
3. 

## Заметки
- `;
}
