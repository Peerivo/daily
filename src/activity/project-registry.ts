import type { ProjectId, StoredActivityItem } from "./types.js";

export const DAILY_PROJECT_GROUPS = [
  "peerivo-core",
  "publishing",
  "mercy",
  "marketplace",
  "business",
  "research",
  "personal",
] as const;

export type DailyProjectGroup = (typeof DAILY_PROJECT_GROUPS)[number];

export const DAILY_PROJECT_PRIORITIES = [
  "critical",
  "high",
  "medium",
  "low",
] as const;

export type DailyProjectPriority = (typeof DAILY_PROJECT_PRIORITIES)[number];

export interface DailyProjectDefinition {
  id: string;
  title: string;
  group: DailyProjectGroup;
  priority: DailyProjectPriority;
  cadenceDays: number;
  activityProjectId: ProjectId | null;
  repo: string | null;
  keywords: readonly string[];
  notes: string | null;
}

export interface ProjectActivitySummary {
  project: DailyProjectDefinition;
  activityCount: number;
  latestActivityAt: Date | null;
  daysSinceActivity: number | null;
  isStale: boolean;
  status: "active" | "stale" | "never_seen";
}

export const DAILY_PROJECT_REGISTRY = [
  {
    id: "peerivo-network",
    title: "Peerivo Network",
    group: "peerivo-core",
    priority: "critical",
    cadenceDays: 1,
    activityProjectId: "peerivo",
    repo: "Peerivo/network",
    keywords: ["peerivo network", "peerivo.net", "people", "companies", "agents"],
    notes: "Main Peerivo social/professional network surface.",
  },
  {
    id: "peerivo-publisher",
    title: "Peerivo Publisher",
    group: "publishing",
    priority: "critical",
    cadenceDays: 1,
    activityProjectId: "peerivo",
    repo: "Peerivo/publisher",
    keywords: ["publisher", "publication", "publishing", "metricool", "social"],
    notes: "Shared publishing service for Peerivo products.",
  },
  {
    id: "peerivo-marketing",
    title: "Peerivo Marketing",
    group: "business",
    priority: "high",
    cadenceDays: 2,
    activityProjectId: "peerivo",
    repo: "Peerivo/marketing",
    keywords: ["marketing", "ai marketer", "content runway", "telegram-first"],
    notes: "Telegram-first AI marketing product.",
  },
  {
    id: "daily",
    title: "Daily Activity Layer",
    group: "peerivo-core",
    priority: "critical",
    cadenceDays: 1,
    activityProjectId: null,
    repo: "Peerivo/daily",
    keywords: ["daily", "activity inbox", "daily activity", "journal"],
    notes: "Personal/project command center and activity inbox.",
  },
  {
    id: "mercy-platform",
    title: "Mercy Platform",
    group: "mercy",
    priority: "critical",
    cadenceDays: 1,
    activityProjectId: "mercy-platform",
    repo: "Peerivo/mercy-platform",
    keywords: ["mercy", "язык милосердия", "help request", "volunteer"],
    notes: "General help and volunteer platform; CareCall is separate.",
  },
  {
    id: "carecall",
    title: "CareCall",
    group: "mercy",
    priority: "high",
    cadenceDays: 3,
    activityProjectId: null,
    repo: null,
    keywords: ["carecall", "nurse", "medical visit", "медсестра", "уколы"],
    notes: "Separate medical home-visit project, not part of Mercy Platform.",
  },
  {
    id: "postbazar",
    title: "PostBazar",
    group: "marketplace",
    priority: "high",
    cadenceDays: 2,
    activityProjectId: "postbazar",
    repo: "Peerivo/postbazar",
    keywords: ["postbazar", "classifieds", "collector", "max", "telegram", "listing"],
    notes: "Classifieds aggregator for Batumi/nearby listings.",
  },
  {
    id: "autocrm",
    title: "AutoCRM",
    group: "business",
    priority: "high",
    cadenceDays: 3,
    activityProjectId: null,
    repo: "Peerivo/autocrm",
    keywords: ["autocrm", "1c", "1с", "автосервис", "автостекло", "детейлинг"],
    notes: "1C-based CRM/product packaging for auto service workflows.",
  },
  {
    id: "ai-factory",
    title: "AI Factory",
    group: "peerivo-core",
    priority: "critical",
    cadenceDays: 1,
    activityProjectId: "ai-factory",
    repo: null,
    keywords: ["ai factory", "factory", "codex", "worker", "branch", "pr"],
    notes: "Execution layer: one milestone, one branch, one task, checks, PR.",
  },
  {
    id: "ai-ceo",
    title: "AI CEO",
    group: "business",
    priority: "medium",
    cadenceDays: 7,
    activityProjectId: null,
    repo: "olegka85/ai-ceo",
    keywords: ["ai ceo", "diagnostics", "automation plan", "business diagnosis"],
    notes: "Business diagnostics and automation planning MVP.",
  },
  {
    id: "ai-hosting",
    title: "AI Hosting",
    group: "business",
    priority: "medium",
    cadenceDays: 14,
    activityProjectId: null,
    repo: null,
    keywords: ["ai hosting", "hosting", "byok", "docker", "deploy by chat"],
    notes: "Chat-driven deployment/hosting product concept.",
  },
  {
    id: "living-menaion",
    title: "Peerivo Living Menaion",
    group: "publishing",
    priority: "high",
    cadenceDays: 3,
    activityProjectId: null,
    repo: null,
    keywords: ["living menaion", "четьи", "минеи", "calendar", "vr", "360"],
    notes: "Canonical daily Orthodox calendar/audio/library project.",
  },
  {
    id: "symphony",
    title: "Симфония",
    group: "publishing",
    priority: "high",
    cadenceDays: 5,
    activityProjectId: null,
    repo: null,
    keywords: ["симфония", "bible", "azbyka", "толкования", "scripture"],
    notes: "Biblical/apologetics source map platform; do not pitch AI externally yet.",
  },
  {
    id: "artcompas",
    title: "Art Compass",
    group: "marketplace",
    priority: "medium",
    cadenceDays: 7,
    activityProjectId: null,
    repo: "Peerivo/artcompas",
    keywords: ["artcompas", "art compass", "musician", "booking", "bitrix"],
    notes: "Marketplace/booking platform for musicians and venues.",
  },
  {
    id: "people-os",
    title: "AI People OS",
    group: "business",
    priority: "medium",
    cadenceDays: 7,
    activityProjectId: null,
    repo: null,
    keywords: ["people os", "hr", "1c zup", "1с зуп", "bitrix people"],
    notes: "HR platform baseline: 1C:ZUP source of truth, Bitrix box target.",
  },
  {
    id: "bitrix-sales",
    title: "Bitrix24 Sales Batumi",
    group: "business",
    priority: "high",
    cadenceDays: 2,
    activityProjectId: "bitrix",
    repo: null,
    keywords: ["bitrix", "битрикс", "batumi", "next group", "crm sales"],
    notes: "Local Bitrix24 sales, offers, follow-ups, client discovery.",
  },
  {
    id: "bitrix-cases",
    title: "Bitrix24 Cases",
    group: "business",
    priority: "medium",
    cadenceDays: 7,
    activityProjectId: "bitrix",
    repo: null,
    keywords: ["mobile app", "битрикс24 кейс", "customization", "d7", "smart process"],
    notes: "Reusable Bitrix24 implementation/case portfolio.",
  },
  {
    id: "agent-manager-academy",
    title: "Agent Manager Academy",
    group: "peerivo-core",
    priority: "medium",
    cadenceDays: 7,
    activityProjectId: "peerivo",
    repo: null,
    keywords: ["agent manager", "academy", "real work", "delegation", "agent contract"],
    notes: "Practical professional development through real agent-managed work.",
  },
  {
    id: "expert-twin",
    title: "Peerivo Expert Twin",
    group: "peerivo-core",
    priority: "medium",
    cadenceDays: 10,
    activityProjectId: "peerivo",
    repo: null,
    keywords: ["expert twin", "human agent", "digital representative", "profile agent"],
    notes: "Human expert AI representative concept for Peerivo.",
  },
  {
    id: "ai-constitution",
    title: "AI Constitution",
    group: "research",
    priority: "medium",
    cadenceDays: 14,
    activityProjectId: null,
    repo: null,
    keywords: ["ai constitution", "asimov", "agent passport", "infected agents", "ai police"],
    notes: "Safety/identity/provenance rules for agents.",
  },
  {
    id: "ai-digital-signage",
    title: "AI Digital Signage",
    group: "business",
    priority: "low",
    cadenceDays: 21,
    activityProjectId: null,
    repo: null,
    keywords: ["digital signage", "restaurant screen", "android tv", "menu screen"],
    notes: "AI-managed screens for restaurants and local businesses.",
  },
  {
    id: "dar-life",
    title: "Дарю жизнь",
    group: "research",
    priority: "low",
    cadenceDays: 30,
    activityProjectId: null,
    repo: null,
    keywords: ["дарю жизнь", "pro-life", "законопроект", "аборты"],
    notes: "Research/advocacy project requiring neutral sourced legal/policy work.",
  },
] as const satisfies readonly DailyProjectDefinition[];

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const priorityRank: Record<DailyProjectPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function daysBetweenUtcDates(later: Date, earlier: Date): number {
  return Math.max(
    0,
    Math.floor(
      (startOfUtcDay(later).getTime() - startOfUtcDay(earlier).getTime()) /
        DAY_IN_MS,
    ),
  );
}

function activityText(item: StoredActivityItem): string {
  return [
    item.title,
    item.summary,
    item.rawText,
    item.actorName,
    item.actorEmail,
    item.url,
    JSON.stringify(item.metadata),
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLocaleLowerCase();
}

export function activityMatchesProject(
  project: DailyProjectDefinition,
  item: StoredActivityItem,
): boolean {
  if (project.activityProjectId !== null && item.projectId === project.activityProjectId) {
    return true;
  }

  const text = activityText(item);
  const repoKeyword = project.repo === null ? [] : [project.repo];
  const keywords = [project.id, project.title, ...repoKeyword, ...project.keywords];

  return keywords.some((keyword) => text.includes(keyword.toLocaleLowerCase()));
}

function compareProjectSummaries(
  left: ProjectActivitySummary,
  right: ProjectActivitySummary,
): number {
  const priorityDifference =
    priorityRank[left.project.priority] - priorityRank[right.project.priority];
  return priorityDifference || left.project.title.localeCompare(right.project.title);
}

export function summarizeProjectActivity(
  activities: readonly StoredActivityItem[],
  projects: readonly DailyProjectDefinition[] = DAILY_PROJECT_REGISTRY,
  now = new Date(),
): ProjectActivitySummary[] {
  return projects
    .map((project): ProjectActivitySummary => {
      const projectActivities = activities.filter((item) =>
        activityMatchesProject(project, item),
      );
      const latestActivityAt = projectActivities.reduce<Date | null>(
        (latest, item) =>
          latest === null || item.occurredAt > latest ? item.occurredAt : latest,
        null,
      );
      const daysSinceActivity =
        latestActivityAt === null ? null : daysBetweenUtcDates(now, latestActivityAt);
      const isStale =
        daysSinceActivity === null || daysSinceActivity > project.cadenceDays;

      return {
        project,
        activityCount: projectActivities.length,
        latestActivityAt,
        daysSinceActivity,
        isStale,
        status:
          daysSinceActivity === null
            ? "never_seen"
            : isStale
              ? "stale"
              : "active",
      };
    })
    .sort(compareProjectSummaries);
}

export function findStaleProjects(
  activities: readonly StoredActivityItem[],
  projects: readonly DailyProjectDefinition[] = DAILY_PROJECT_REGISTRY,
  now = new Date(),
): ProjectActivitySummary[] {
  return summarizeProjectActivity(activities, projects, now).filter(
    (summary) => summary.isStale,
  );
}

export function getDailyProjectById(
  projectId: string,
  projects: readonly DailyProjectDefinition[] = DAILY_PROJECT_REGISTRY,
): DailyProjectDefinition | null {
  return projects.find((project) => project.id === projectId) ?? null;
}


export function findDailyProjectsForActivity(
  item: StoredActivityItem,
  projects: readonly DailyProjectDefinition[] = DAILY_PROJECT_REGISTRY,
): DailyProjectDefinition[] {
  return projects.filter((project) => activityMatchesProject(project, item));
}
