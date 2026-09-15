CREATE TABLE activity_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN (
    'gmail',
    'google_calendar',
    'google_drive',
    'github',
    'vercel',
    'supabase',
    'telegram',
    'crm'
  )),
  source_account_id text NOT NULL,
  external_id text NOT NULL,
  thread_id text,
  project_id text,
  title text NOT NULL,
  summary text,
  raw_text text,
  url text,
  actor_name text,
  actor_email text,
  activity_type text NOT NULL CHECK (activity_type IN (
    'email_message',
    'email_reply',
    'email_attachment',
    'invoice',
    'document',
    'document_comment',
    'document_updated',
    'meeting',
    'deadline',
    'deploy',
    'issue',
    'pull_request',
    'system_alert',
    'task'
  )),
  status text NOT NULL DEFAULT 'new' CHECK (status IN (
    'new',
    'seen',
    'needs_action',
    'ignored',
    'done'
  )),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN (
    'low',
    'medium',
    'high',
    'urgent'
  )),
  occurred_at timestamptz NOT NULL,
  detected_at timestamptz NOT NULL,
  due_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX activity_items_source_account_external_uidx
  ON activity_items (source, source_account_id, external_id);

CREATE INDEX activity_items_occurred_at_idx
  ON activity_items (occurred_at DESC);

CREATE INDEX activity_items_status_priority_idx
  ON activity_items (status, priority);

CREATE INDEX activity_items_project_id_idx
  ON activity_items (project_id)
  WHERE project_id IS NOT NULL;
