#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs/promises";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:4317";
const pairingCode = process.env.PAIRING_CODE;
const expectedText = process.env.SMOKE_EXPECTED_TEXT ?? "REMOTE_CONTROL_OK";
const prompt =
  process.env.SMOKE_PROMPT ??
  `Reply with exactly ${expectedText}. Do not run shell commands or edit files.`;

if (!pairingCode) {
  console.error("PAIRING_CODE is required");
  process.exit(2);
}

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

async function readStream(sessionId) {
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
    }
  }

  return { output, finalStatus };
}

const health = await api("/api/health", { method: "GET", headers: {} });
assert.equal(health.ok, true);
assert.equal(health.allowLan, false);

const pairing = await api("/api/pair", {
  method: "POST",
  body: JSON.stringify({ code: pairingCode }),
  headers: {},
});
token = pairing.token;
assert.ok(token);
assert.ok(pairing.workspaces.length > 0);

const created = await api("/api/tasks", {
  method: "POST",
  body: JSON.stringify({
    prompt,
    workspace: pairing.workspaces[0],
  }),
});

const stream = await readStream(created.session.id);
assert.equal(stream.finalStatus, "completed");
assert.match(stream.output, new RegExp(expectedText));
await fs.access(created.session.logPath);

console.log(
  JSON.stringify({
    status: stream.finalStatus,
    outputContainsExpectedText: stream.output.includes(expectedText),
    logPath: created.session.logPath,
  }),
);
