#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs/promises";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:4317";
let pairingCode = process.env.PAIRING_CODE;
const expectAllowLan = process.env.SMOKE_EXPECT_ALLOW_LAN === "true";
const baseHostname = new URL(baseUrl).hostname;
const baseIsLoopback = baseHostname === "127.0.0.1" || baseHostname === "localhost" || baseHostname === "::1";

let token = "";

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers ?? {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${path} failed: ${data.error ?? response.status}`);
  }
  return data;
}

async function readStream(sessionId, stopAfterFirstOutput = false) {
  const response = await fetch(`${baseUrl}/api/tasks/${sessionId}/stream`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(response.ok, true);
  assert.ok(response.body);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let output = "";
  let finalStatus = "";
  let stopSent = false;

  while (true) {
    const result = await reader.read();
    if (result.done) break;
    buffer += decoder.decode(result.value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const dataLine = part.split("\n").find((line) => line.startsWith("data: "));
      if (!dataLine) continue;
      const data = JSON.parse(dataLine.slice(6));
      if (data.text) output += data.text;
      if (data.status) finalStatus = data.status;
      if (stopAfterFirstOutput && data.text?.includes("mock output") && !stopSent) {
        stopSent = true;
        await api(`/api/tasks/${sessionId}/stop`, { method: "POST" });
      }
    }
  }

  return { output, finalStatus };
}

const health = await api("/api/health", { method: "GET", headers: {} });
assert.equal(health.ok, true);
assert.equal(health.allowLan, expectAllowLan);
assert.equal(health.localPairingCodeAvailable, baseIsLoopback);

if (expectAllowLan && !baseIsLoopback) {
  const response = await fetch(`${baseUrl}/api/local-pairing-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  assert.equal(response.status, 403);
}

if (!pairingCode) {
  const localPairing = await api("/api/local-pairing-code", { method: "POST", headers: {} });
  pairingCode = localPairing.code;
}
assert.ok(pairingCode);

const pairing = await api("/api/pair", {
  method: "POST",
  body: JSON.stringify({ code: pairingCode }),
  headers: {},
});
token = pairing.token;
assert.ok(token);
assert.ok(pairing.workspaces.length > 0);

const run = await api("/api/tasks", {
  method: "POST",
  body: JSON.stringify({
    prompt: "Smoke test: normal run",
    workspace: pairing.workspaces[0],
  }),
});
const runStream = await readStream(run.session.id);
assert.match(runStream.output, /mock output 3/);
assert.equal(runStream.finalStatus, "completed");

const stopRun = await api("/api/tasks", {
  method: "POST",
  body: JSON.stringify({
    prompt: "Smoke test: long running task",
    workspace: pairing.workspaces[0],
  }),
});
const stopStream = await readStream(stopRun.session.id, true);
assert.match(stopStream.output, /mock output/);
assert.equal(stopStream.finalStatus, "stopped");

const sessions = await api("/api/tasks", { method: "GET" });
assert.ok(sessions.sessions.some((session) => session.id === run.session.id && session.status === "completed"));
assert.ok(sessions.sessions.some((session) => session.id === stopRun.session.id && session.status === "stopped"));

const runDetail = await api(`/api/tasks/${run.session.id}`, { method: "GET" });
assert.equal(runDetail.session.status, "completed");
assert.ok(runDetail.events.some((event) => event.text?.includes("mock output 3")));

const stopDetail = await api(`/api/tasks/${stopRun.session.id}`, { method: "GET" });
assert.equal(stopDetail.session.status, "stopped");
assert.ok(stopDetail.events.some((event) => event.text?.includes("Stop requested")));

await fs.access(run.session.logPath);
await fs.access(stopRun.session.logPath);

console.log("smoke ok");
