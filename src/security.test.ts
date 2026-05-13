import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { loadConfig } from "./config.js";
import { buildCodexCommand } from "./runner.js";
import { redactSecrets, sanitizeTerminalText } from "./security.js";
import { resolveAllowedWorkspace } from "./workspace.js";

test("workspace resolver accepts paths inside allowlist", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "remote-control-"));
  const child = path.join(root, "child");
  await fs.mkdir(child);
  assert.equal(await resolveAllowedWorkspace(child, [root]), await fs.realpath(child));
});

test("workspace resolver rejects paths outside allowlist", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "remote-control-"));
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), "remote-control-outside-"));
  await assert.rejects(() => resolveAllowedWorkspace(outside, [root]), /outside/);
});

test("workspace resolver rejects symlink escape", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "remote-control-"));
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), "remote-control-outside-"));
  const link = path.join(root, "escape");
  await fs.symlink(outside, link);
  await assert.rejects(() => resolveAllowedWorkspace(link, [root]), /outside/);
});

test("codex command is explicit and does not include prompt text", () => {
  const config = loadConfig();
  const workspace = process.cwd();
  const command = buildCodexCommand(config, workspace);
  assert.equal(command.file, config.codexBin);
  assert.equal(command.shell, false);
  assert.equal(command.detached, true);
  assert.deepEqual(command.args.slice(0, 2), ["exec", "--skip-git-repo-check"]);
  assert.ok(command.args.includes("-C"));
  assert.ok(command.args.includes(workspace));
  assert.equal(command.args.at(-1), "-");
  assert.equal(command.args.includes("hello; rm -rf /"), false);
});

test("browser output strips terminal controls and redacts likely secrets", () => {
  assert.equal(sanitizeTerminalText("\u001b[31mred\u001b[0m"), "red");
  assert.equal(redactSecrets("token=sk-abcdefghijklmnopqrstuvwxyz"), "token=[REDACTED]");
});
