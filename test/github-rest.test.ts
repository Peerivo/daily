import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  GitHubRestActivityClient,
  type GitHubFetch,
} from "../src/index.js";

function response(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
    async text() {
      return typeof body === "string" ? body : JSON.stringify(body);
    },
  };
}

describe("GitHubRestActivityClient", () => {
  it("collects PRs, issues and workflow runs inside the requested window", async () => {
    const seenUrls: string[] = [];
    const fetchImpl: GitHubFetch = async (url) => {
      seenUrls.push(url);

      if (url.includes("/pulls?")) {
        return response([
          {
            id: 10,
            number: 2,
            title: "Ship Daily",
            html_url: "https://github.com/Peerivo/daily/pull/2",
            user: { login: "olegka85" },
            updated_at: "2026-09-18T12:00:00Z",
            state: "open",
          },
        ]);
      }

      if (url.includes("/issues?")) {
        return response([
          {
            id: 20,
            number: 3,
            title: "Wire Knowledge",
            html_url: "https://github.com/Peerivo/daily/issues/3",
            user: { login: "olegka85" },
            updated_at: "2026-09-18T11:00:00Z",
            state: "open",
          },
          {
            id: 10,
            number: 2,
            title: "PR duplicate returned from issues API",
            html_url: "https://github.com/Peerivo/daily/pull/2",
            updated_at: "2026-09-18T12:00:00Z",
            state: "open",
            pull_request: {},
          },
        ]);
      }

      return response({
        workflow_runs: [
          {
            id: 30,
            name: "CI",
            display_title: "CI",
            html_url: "https://github.com/Peerivo/daily/actions/runs/30",
            actor: { login: "github-actions" },
            updated_at: "2026-09-18T10:00:00Z",
            status: "completed",
            conclusion: "failure",
          },
        ],
      });
    };

    const client = new GitHubRestActivityClient({
      repositories: ["Peerivo/daily"],
      fetchImpl,
    });

    const records = await client.fetchActivityRecords({
      since: new Date("2026-09-18T09:00:00Z"),
      until: new Date("2026-09-18T13:00:00Z"),
      accountId: "peerivo",
    });

    assert.equal(records.length, 3);
    assert.deepEqual(
      records.map((record) => record.kind).sort(),
      ["issue", "pull_request", "workflow_run"],
    );
    assert.equal(
      records.find((record) => record.kind === "workflow_run")?.conclusion,
      "failure",
    );
    assert.equal(seenUrls.length, 3);
  });

  it("turns an inaccessible repository into an actionable failure record", async () => {
    const client = new GitHubRestActivityClient({
      repositories: ["Peerivo/private-project"],
      fetchImpl: async () => response("not found", 404),
    });

    const records = await client.fetchActivityRecords({
      since: new Date("2026-09-18T09:00:00Z"),
      until: new Date("2026-09-18T13:00:00Z"),
      accountId: "peerivo",
    });

    assert.equal(records.length, 1);
    assert.equal(records[0]?.kind, "check_run");
    assert.equal(records[0]?.conclusion, "failure");
    assert.match(records[0]?.state ?? "", /GitHub API request failed \(404\)/);
  });

  it("rejects malformed repository identifiers before requesting GitHub", async () => {
    const client = new GitHubRestActivityClient({
      repositories: ["not-a-repository"],
      fetchImpl: async () => response([]),
    });

    await assert.rejects(
      client.fetchActivityRecords({
        since: new Date("2026-09-18T09:00:00Z"),
        until: new Date("2026-09-18T13:00:00Z"),
        accountId: "peerivo",
      }),
      /Invalid GitHub repository/,
    );
  });
});
