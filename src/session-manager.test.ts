import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { AuditLog } from "./audit.js";
import { CodexRunner } from "./runner.js";
import { SessionManager } from "./session-manager.js";
import { AppConfig, SessionRecord } from "./types.js";

const config: AppConfig = {
  host: "127.0.0.1",
  port: 4317,
  allowLan: false,
  workspaceAllowlist: [process.cwd()],
  codexBin: "codex",
  codexExtraArgs: [],
  promptMaxLength: 8000,
  tokenTtlMs: 60_000,
  pairingCodeTtlMs: 60_000,
  dataDir: "",
};

function record(id: string, status: SessionRecord["status"]): SessionRecord {
  return {
    id,
    createdAt: "2026-05-12T00:00:00.000Z",
    updatedAt: "2026-05-12T00:00:00.000Z",
    workspace: process.cwd(),
    promptSummary: "interrupted task",
    status,
    exitCode: null,
    signal: null,
    logPath: `/tmp/${id}.jsonl`,
  };
}

test("restoreFromAudit keeps old running sessions out of active process state", async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "remote-control-session-"));
  const audit = new AuditLog(dataDir);
  await audit.init();
  await audit.appendSession(record("interrupted", "running"));

  const manager = new SessionManager(new CodexRunner({ ...config, dataDir }), audit);
  const restored = await manager.restoreFromAudit();
  assert.equal(restored, 1);
  assert.equal(manager.getSession("interrupted")?.status, "failed");
  assert.equal(manager.hasActiveSession(), false);
});
