export const GMAIL_DISCOVERY_RULES = [
  "new incoming messages",
  "unread messages",
  "replies in existing threads",
  "messages with attachments",
  "invoices, statements, and contracts",
  "messages likely requiring a reply",
  "messages from important contacts",
] as const;

export const GOOGLE_CALENDAR_DISCOVERY_RULES = [
  "events today",
  "events tomorrow",
  "new meetings",
  "changed meetings",
  "deadlines",
  "meetings awaiting acceptance",
  "past events that may require follow-up",
] as const;

export const GOOGLE_DRIVE_DISCOVERY_RULES = [
  "recently changed documents",
  "documents with comments",
  "documents mentioning the user",
  "new files in project folders",
  "documents matching project keywords",
] as const;
