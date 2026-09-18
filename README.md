# Daily Activity Layer

Provider-neutral activity inbox and lightweight daily journal for Peerivo Daily.
It normalizes provider events, assigns a project and activity type, upserts them
without duplicates, builds a digest, and renders a human-readable daily journal.

## Included so far

- PostgreSQL migration for `activity_items`, including the unique identity
  `(source, source_account_id, external_id)`.
- Strict TypeScript types for sources, activity types, statuses, priorities,
  normalized items, and connectors.
- Gmail, Google Calendar, and Google Drive connector skeletons with provider DTOs
  and normalization methods. Network calls are intentionally deferred.
- A mock connector and in-memory repository for tests.
- A PostgreSQL repository using `INSERT ... ON CONFLICT ... DO UPDATE`.
- Keyword-based activity classification and project mapping.
- Daily runner, structured digest model, and Markdown digest renderer.
- Canonical project registry for the current Peerivo workspace.
- Stale-project detection based on per-project cadence.
- Markdown daily journal renderer and blank manual journal template.

## Why this layer is urgent

Daily is the command center, not just a diary. Its job is to answer every day:

- what moved across the projects;
- what is urgent;
- who needs a reply;
- what has invoices/documents;
- which projects have gone stale;
- what should be done tomorrow.

OAuth and real provider clients are intentionally not required for the journal
MVP. A useful manual/semi-automatic journal should exist before the product adds
credential storage, schedulers, and Google API synchronization.

## Usage: activity check

```ts
import {
  GmailActivityConnector,
  GoogleCalendarActivityConnector,
  GoogleDriveActivityConnector,
  PostgresActivityItemRepository,
  runDailyActivityCheck,
} from "@peerivo/daily-activity";

const repository = new PostgresActivityItemRepository(databaseClient);

const result = await runDailyActivityCheck(
  {
    since: new Date("2026-09-15T00:00:00Z"),
    until: new Date("2026-09-16T00:00:00Z"),
    accountId: "google-account-id",
  },
  {
    connectors: [
      new GmailActivityConnector(),
      new GoogleCalendarActivityConnector(),
      new GoogleDriveActivityConnector(),
    ],
    repository,
  },
);

console.log(result.digest);
```

`databaseClient` only needs a `query(sql, values)` method compatible with the
exported `SqlClient` interface, so `pg`, an existing database wrapper, or a
transaction-scoped client can be used without coupling the activity domain to
one database library.

## Usage: daily journal

```ts
import {
  createDailyJournalTemplate,
  renderDailyJournal,
} from "@peerivo/daily-activity";

const blank = createDailyJournalTemplate(new Date("2026-09-17T00:00:00Z"));

const journal = renderDailyJournal({
  date: new Date("2026-09-17T00:00:00Z"),
  generatedAt: new Date("2026-09-17T09:00:00Z"),
  items: result.activities,
  completed: ["Reviewed Daily Activity Layer scope"],
  tomorrow: ["Close one urgent project follow-up"],
});

console.log(blank);
console.log(journal);
```

The rendered journal contains sections for completed work, urgent items,
replies, project movement, stale projects, meetings, documents, invoices, next
actions, and notes.

## Project registry and stale detection

`DAILY_PROJECT_REGISTRY` is the canonical lightweight registry for the current
workspace. Each project has:

- stable `id`;
- title;
- group;
- priority;
- target cadence in days;
- optional repository;
- optional activity-level `projectId` mapping;
- keywords for matching unstructured activity text.

Use `summarizeProjectActivity()` to get activity counts and freshness per
project. Use `findStaleProjects()` to list projects whose latest matching
activity is older than their target cadence, or that have not been seen yet.

This is not a replacement for a full project database. It is the practical first
layer that lets Daily say: "this project moved" or "this project has gone quiet".

## Connector discovery rules

The rules are exported from `src/activity/connectors/rules.ts`, so future API
implementations and tests share the same declared behavior.

Gmail will discover new incoming and unread messages, thread replies,
attachments, financial/legal documents, likely reply requests, and messages
from important contacts. Calendar will discover today's and tomorrow's events,
new or changed meetings, deadlines, unanswered invitations, and likely
follow-ups. Drive will discover recently changed documents, comments and user
mentions, new project-folder files, and keyword-related documents.

The three connector `normalize()` methods already map provider-shaped records
to `NormalizedActivityItem`. Real API clients should remain read-only and should
be added after the journal format is proven useful.

## Security boundary

The first stage is read-only. It must not send, delete, archive, accept, or edit
mail, events, files, or comments.

- Never commit OAuth access or refresh tokens, and do not keep them as plaintext
  values in `.env`. Store them in encrypted application storage or the hosting
  provider's secret manager, and keep account references in the application DB.
- Gmail scope: `gmail.readonly` only.
- Calendar scope: `calendar.readonly` only.
- Drive scope: prefer `drive.metadata.readonly`; request `drive.readonly` only
  when document contents are required for classification.
- Validate that each returned provider record belongs to the requested account,
  and redact sensitive content from logs and error telemetry.

## Database migration

Apply `migrations/0001_create_activity_items.sql` with the project's migration
runner. `project_id` is currently a stable project slug because this repository
does not yet contain a projects table. A later foreign-key migration can convert
it once project ownership and IDs are established.

## Commands

```sh
npm install
npm run lint
npm test
npm run build
npm run check
```

## Next PR

1. Add a persisted daily journal file writer or storage adapter.
2. Add GitHub activity ingestion for PRs/issues/checks before Google OAuth.
3. Add Gmail read-only ingestion for replies, invoices, and follow-ups.
4. Add scheduler/observability/retries only after manual journal output is useful.
5. Add encrypted OAuth provider accounts when the product needs external users to
   connect their own accounts.


## Scheduled Daily runtime

Daily is scheduled by GitHub Actions at **09:00 Asia/Tbilisi (05:00 UTC)** and can
also be started manually with `workflow_dispatch`. Each run:

1. reads GitHub activity for repositories in `DAILY_PROJECT_REGISTRY`;
2. keeps inaccessible repositories as explicit actionable alerts instead of
   aborting the whole report;
3. optionally exchanges candidates/context with Knowledge when
   `KNOWLEDGE_BASE_URL` is configured;
4. writes `journals/YYYY-MM-DD.md`;
5. uploads the journal as a workflow artifact;
6. commits the journal back to `main` when it changed.

For full private-repository coverage, configure the Actions secret
`PEERIVO_DAILY_GITHUB_TOKEN` with read access to the relevant Peerivo
repositories. Without it, the workflow falls back to the repository-scoped
`GITHUB_TOKEN`: public repositories still work and private repositories appear
as ingestion alerts in the journal.

Optional Knowledge secrets:

- `KNOWLEDGE_BASE_URL` — base URL of Peerivo Knowledge;
- `KNOWLEDGE_TOKEN` — bearer token when the Knowledge endpoint requires one.

The Knowledge integration contract is:

- `POST /v1/daily/candidates`;
- `GET /v1/projects/:projectId/context?consumer=daily`.
