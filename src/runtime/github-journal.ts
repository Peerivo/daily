import {
  DAILY_PROJECT_REGISTRY,
  FileSystemDailyJournalStore,
  GitHubActivityConnector,
  GitHubRestActivityClient,
  InMemoryActivityItemRepository,
  buildDailyActivityDigest,
  persistDailyJournal,
  runDailyActivityCheck,
} from "../index.js";

function repositoriesFromEnvironment(): string[] {
  const configured = process.env.DAILY_GITHUB_REPOSITORIES
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (configured && configured.length > 0) {
    return [...new Set(configured)];
  }

  return [
    ...new Set(
      DAILY_PROJECT_REGISTRY.flatMap((project) =>
        project.repo === null ? [] : [project.repo],
      ),
    ),
  ];
}

function positiveInteger(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new TypeError(`${name} must be a positive integer`);
  }
  return parsed;
}

async function main(): Promise<void> {
  const now = new Date();
  const digestHours = positiveInteger("DAILY_DIGEST_HOURS", 24);
  const historyDays = positiveInteger("DAILY_HISTORY_DAYS", 30);
  const repositories = repositoriesFromEnvironment();
  if (repositories.length === 0) {
    throw new Error("No GitHub repositories configured for Daily");
  }

  const historySince = new Date(
    now.getTime() - historyDays * 24 * 60 * 60 * 1000,
  );
  const digestSince = new Date(
    now.getTime() - digestHours * 60 * 60 * 1000,
  );

  const client = new GitHubRestActivityClient({
    repositories,
    token: process.env.DAILY_GITHUB_TOKEN ?? process.env.GITHUB_TOKEN,
  });
  const connector = new GitHubActivityConnector(client, () => now);
  const repository = new InMemoryActivityItemRepository();

  const result = await runDailyActivityCheck(
    {
      since: historySince,
      until: now,
      accountId: process.env.DAILY_GITHUB_ACCOUNT_ID ?? "peerivo",
    },
    {
      connectors: [connector],
      repository,
      now: () => now,
    },
  );

  const recent = result.activities.filter(
    (activity) => activity.occurredAt >= digestSince,
  );
  const digest = buildDailyActivityDigest(recent, now);

  const journal = await persistDailyJournal(
    {
      date: now,
      generatedAt: now,
      items: result.activities,
      digest,
      notes: [
        `GitHub repositories scanned: ${repositories.length}`,
        `GitHub activities in history window: ${result.activities.length}`,
        `GitHub activities in digest window: ${recent.length}`,
      ],
    },
    new FileSystemDailyJournalStore(
      process.env.DAILY_JOURNAL_DIR ?? "journals",
    ),
  );

  process.stdout.write(
    JSON.stringify(
      {
        journal: journal.location,
        repositories: repositories.length,
        historyActivities: result.activities.length,
        digestActivities: recent.length,
      },
      null,
      2,
    ) + "\n",
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
