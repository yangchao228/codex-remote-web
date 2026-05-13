import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { AuditLog } from "./audit.js";
import { SessionRecord } from "./types.js";

function session(id: string, status: SessionRecord["status"]): SessionRecord {
  return {
    id,
    createdAt: "2026-05-12T00:00:00.000Z",
    updatedAt: `2026-05-12T00:00:0${status === "running" ? 0 : 1}.000Z`,
    workspace: "/tmp/workspace",
    promptSummary: "test prompt",
    status,
    exitCode: status === "completed" ? 0 : null,
    signal: null,
    logPath: `/tmp/${id}.jsonl`,
  };
}

test("readLatestSessions returns the latest session record by id", async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "remote-control-audit-"));
  const audit = new AuditLog(dataDir);
  await audit.init();
  await audit.appendSession(session("one", "running"));
  await audit.appendSession(session("one", "completed"));
  await audit.appendSession(session("two", "failed"));

  const records = await audit.readLatestSessions();
  assert.equal(records.length, 2);
  assert.equal(records.find((record) => record.id === "one")?.status, "completed");
  assert.equal(records.find((record) => record.id === "two")?.status, "failed");
});
