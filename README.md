# Daily Activity Layer

Provider-neutral activity inbox for Gmail, Google Calendar, Google Drive, and
future sources. It normalizes provider events, assigns a project and activity
type, upserts them without duplicates, and builds a daily digest model.

## Included in this PR

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

## Usage

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
to `NormalizedActivityItem`. The next PR only needs to provide read-only API
clients and implement `fetchActivities()`.

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
```

## Next PR

1. Add encrypted OAuth credential lookup and per-provider account records.
2. Implement paginated, incremental read-only API clients for Gmail, Calendar,
   and Drive, including provider cursor/history handling.
3. Add source-specific discovery heuristics and fixtures for changed events,
   reply detection, mentions, attachments, financial documents, and follow-up.
4. Run the daily check from the application's scheduler with per-connector
   observability, retry isolation, and persisted sync cursors.
