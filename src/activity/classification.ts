import type {
  ActivityType,
  NormalizedActivityItem,
  ProjectId,
} from "./types.js";

export const PROJECT_KEYWORDS: Readonly<Record<ProjectId, readonly string[]>> = {
  peerivo: ["peerivo", "peerivo.net", "agent", "agents", "network"],
  "mercy-platform": ["mercy", "volunteer", "help request", "charity"],
  "ai-factory": ["factory", "codex", "worker", "task", "executor", "deploy"],
  postbazar: ["postbazar", "объявления", "listing", "marketplace"],
  bitrix: ["bitrix", "битрикс", "crm", "сделка", "лид"],
  finance: ["invoice", "payment", "счёт", "счет", "акт", "balance"],
  personal: ["личное", "reminder", "поездка", "семья"],
};

const INVOICE_KEYWORDS = PROJECT_KEYWORDS.finance;

function includesKeyword(text: string, keyword: string): boolean {
  return text.toLocaleLowerCase().includes(keyword.toLocaleLowerCase());
}

export function activitySearchText(
  item: Pick<
    NormalizedActivityItem,
    "title" | "summary" | "rawText" | "actorName" | "actorEmail" | "metadata"
  >,
): string {
  return [
    item.title,
    item.summary,
    item.rawText,
    item.actorName,
    item.actorEmail,
    JSON.stringify(item.metadata),
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ");
}

export function mapProjectByKeywords(text: string): ProjectId | null {
  let bestMatch: { projectId: ProjectId; index: number } | null = null;

  for (const [projectId, keywords] of Object.entries(PROJECT_KEYWORDS) as Array<
    [ProjectId, readonly string[]]
  >) {
    for (const keyword of keywords) {
      const index = text.toLocaleLowerCase().indexOf(keyword.toLocaleLowerCase());
      if (index !== -1 && (bestMatch === null || index < bestMatch.index)) {
        bestMatch = { projectId, index };
      }
    }
  }

  return bestMatch?.projectId ?? null;
}

export function inferActivityType(
  item: NormalizedActivityItem,
): ActivityType {
  const text = activitySearchText(item);
  if (INVOICE_KEYWORDS.some((keyword) => includesKeyword(text, keyword))) {
    return "invoice";
  }

  return item.activityType;
}

export function classifyActivity(
  item: NormalizedActivityItem,
): NormalizedActivityItem {
  const text = activitySearchText(item);
  return {
    ...item,
    activityType: inferActivityType(item),
    projectId: item.projectId ?? mapProjectByKeywords(text),
  };
}
