import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { renderDailyJournal, type DailyJournalInput } from "./journal.js";
export interface DailyJournalStore { save(date: Date, markdown: string): Promise<string>; }
function dateKey(date: Date): string { return date.toISOString().slice(0, 10); }
export class FileSystemDailyJournalStore implements DailyJournalStore {
  constructor(private readonly rootDirectory = "journals") {}
  async save(date: Date, markdown: string): Promise<string> {
    const path = join(this.rootDirectory, `${dateKey(date)}.md`);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, markdown, "utf8");
    return path;
  }
}
export async function persistDailyJournal(input: DailyJournalInput, store: DailyJournalStore): Promise<{ markdown: string; location: string }> {
  const markdown = renderDailyJournal(input);
  return { markdown, location: await store.save(input.date, markdown) };
}
