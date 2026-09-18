import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { FileSystemDailyJournalStore, GitHubActivityConnector, activityToKnowledgeCandidate, persistDailyJournal, type StoredActivityItem } from "../src/index.js";
describe("M2 persistence and GitHub ingestion", () => {
  it("persists one journal file per date", async () => {
    const directory = await mkdtemp(join(tmpdir(), "peerivo-daily-"));
    const result = await persistDailyJournal({ date: new Date("2026-09-18T00:00:00Z"), generatedAt: new Date("2026-09-18T09:00:00Z") }, new FileSystemDailyJournalStore(directory));
    assert.match(result.location, /2026-09-18\.md$/); assert.equal(await readFile(result.location, "utf8"), result.markdown);
  });
  it("normalizes failed GitHub checks as actionable", () => {
    const [item] = new GitHubActivityConnector().normalize([{ id:"check-1", repository:"Peerivo/daily", kind:"check_run", title:"CI failed", url:null, occurredAt:new Date("2026-09-18T08:00:00Z"), conclusion:"failure" }], "peerivo");
    assert.equal(item?.status, "needs_action"); assert.equal(item?.priority, "high");
  });
  it("maps activity to Knowledge boundary", () => {
    const now=new Date("2026-09-18T08:00:00Z");
    const item: StoredActivityItem={id:"a1",source:"github",sourceAccountId:"peerivo",externalId:"pr-2",threadId:null,projectId:"daily",title:"Daily M2",summary:"merged",rawText:null,url:null,actorName:null,actorEmail:null,activityType:"pull_request",status:"new",priority:"medium",occurredAt:now,detectedAt:now,dueAt:null,metadata:{},createdAt:now,updatedAt:now};
    assert.equal(activityToKnowledgeCandidate(item).projectId, "daily");
  });
});
