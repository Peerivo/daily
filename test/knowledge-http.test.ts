import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  HttpKnowledgePort,
  type KnowledgeFetch,
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

describe("HttpKnowledgePort", () => {
  it("submits Daily candidates using the canonical contract", async () => {
    let requestUrl = "";
    let requestBody = "";
    let authorization = "";

    const fetchImpl: KnowledgeFetch = async (url, init) => {
      requestUrl = url;
      requestBody = init?.body ?? "";
      authorization = init?.headers?.Authorization ?? "";
      return response({ accepted: 1 });
    };

    const port = new HttpKnowledgePort({
      baseUrl: "https://knowledge.example.test/",
      token: "secret",
      fetchImpl,
    });

    await port.submitCandidates([
      {
        activityId: "activity-1",
        projectIds: ["daily"],
        title: "Daily PR merged",
        summary: "closed",
        occurredAt: new Date("2026-09-18T12:00:00Z"),
        evidenceUrl: "https://github.com/Peerivo/daily/pull/3",
      },
    ]);

    assert.equal(
      requestUrl,
      "https://knowledge.example.test/v1/daily/candidates",
    );
    assert.equal(authorization, "Bearer secret");

    const parsed = JSON.parse(requestBody) as {
      source: string;
      candidates: Array<{
        projectIds: string[];
        occurredAt: string;
      }>;
    };
    assert.equal(parsed.source, "daily");
    assert.deepEqual(parsed.candidates[0]?.projectIds, ["daily"]);
    assert.equal(
      parsed.candidates[0]?.occurredAt,
      "2026-09-18T12:00:00.000Z",
    );
  });

  it("reads project context for Daily", async () => {
    const fetchImpl: KnowledgeFetch = async () =>
      response({
        projectId: "daily",
        summary: "Daily is the operational command center.",
        facts: ["Knowledge remains the durable memory layer."],
      });

    const port = new HttpKnowledgePort({
      baseUrl: "https://knowledge.example.test",
      fetchImpl,
    });

    const context = await port.getProjectContext("daily");

    assert.equal(context?.projectId, "daily");
    assert.equal(
      context?.summary,
      "Daily is the operational command center.",
    );
    assert.deepEqual(context?.facts, [
      "Knowledge remains the durable memory layer.",
    ]);
  });

  it("treats missing project context as an empty Knowledge result", async () => {
    const port = new HttpKnowledgePort({
      baseUrl: "https://knowledge.example.test",
      fetchImpl: async () => response("not found", 404),
    });

    assert.equal(await port.getProjectContext("unknown"), null);
  });
});
