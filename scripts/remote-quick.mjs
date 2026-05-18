#!/usr/bin/env node

import { spawn } from "node:child_process";
import process from "node:process";

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_PAIRING_TTL_MS = 15 * 60 * 1000;

function parseDuration(value) {
  const match = String(value).trim().match(/^(\d+)(s|m|h)?$/);
  if (!match) {
    throw new Error(`Invalid duration: ${value}. Use formats like 30m, 2h, or 900s.`);
  }
  const amount = Number(match[1]);
  const unit = match[2] ?? "s";
  const multiplier = unit === "h" ? 60 * 60 * 1000 : unit === "m" ? 60 * 1000 : 1000;
  return amount * multiplier;
}

function formatDuration(ms) {
  if (ms % (60 * 60 * 1000) === 0) return `${ms / (60 * 60 * 1000)}h`;
  if (ms % (60 * 1000) === 0) return `${ms / (60 * 1000)}m`;
  return `${Math.round(ms / 1000)}s`;
}

function parseArgs(argv) {
  const options = {
    ttlMs: DEFAULT_TTL_MS,
    port: Number(process.env.REMOTE_CONTROL_PORT ?? 4317),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--ttl") {
      options.ttlMs = parseDuration(argv[++index]);
      continue;
    }
    if (arg?.startsWith("--ttl=")) {
      options.ttlMs = parseDuration(arg.slice("--ttl=".length));
      continue;
    }
    if (arg === "--port") {
      options.port = Number(argv[++index]);
      continue;
    }
    if (arg?.startsWith("--port=")) {
      options.port = Number(arg.slice("--port=".length));
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!Number.isInteger(options.port) || options.port <= 0) {
    throw new Error("--port must be a positive integer");
  }
  if (options.ttlMs <= 0 || options.ttlMs > MAX_TTL_MS) {
    throw new Error(`--ttl must be greater than 0 and no longer than ${formatDuration(MAX_TTL_MS)}`);
  }

  return options;
}

function printHelp() {
  console.log(`Usage: npm run remote:quick -- [--ttl 24h] [--port 4317]

Starts a temporary Cloudflare quick tunnel for mobile remote access.

Defaults:
  --ttl  24h   Auto-stop both the local server and tunnel after this duration.
  --port 4317 Local server port.

Examples:
  npm run remote:quick
  npm run remote:quick -- --ttl 30m
  npm run remote:quick -- --ttl 2h --port 4325`);
}

function runBuild() {
  const build = spawn("npm", ["run", "build"], { stdio: "inherit" });
  return new Promise((resolve, reject) => {
    build.on("error", reject);
    build.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Build failed with exit code ${code}`));
    });
  });
}

function waitForPattern(child, pattern, label) {
  return new Promise((resolve, reject) => {
    let output = "";
    const onData = (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
      const match = output.match(pattern);
      if (match) {
        cleanup();
        resolve(match);
      }
    };
    const onExit = (code) => {
      cleanup();
      reject(new Error(`${label} exited before it became ready (code ${code})`));
    };
    const cleanup = () => {
      child.stdout?.off("data", onData);
      child.stderr?.off("data", onData);
      child.off("exit", onExit);
    };
    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    child.on("exit", onExit);
  });
}

function pipeAfterReady(child) {
  child.stdout?.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr?.on("data", (chunk) => process.stderr.write(chunk));
}

function stopProcess(child, signal = "SIGTERM") {
  if (!child || child.killed || child.exitCode !== null) return;
  child.kill(signal);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const ttlSeconds = Math.ceil(options.ttlMs / 1000);
  const pairingTtlSeconds = Math.ceil(Math.min(options.ttlMs, DEFAULT_PAIRING_TTL_MS) / 1000);
  const expiresAt = new Date(Date.now() + options.ttlMs);
  const localUrl = `http://127.0.0.1:${options.port}`;
  const children = [];
  let stopped = false;

  const cleanup = (reason) => {
    if (stopped) return;
    stopped = true;
    console.log(`\nStopping remote quick tunnel${reason ? `: ${reason}` : ""}`);
    for (const child of children.toReversed()) {
      stopProcess(child);
    }
    setTimeout(() => {
      for (const child of children.toReversed()) {
        stopProcess(child, "SIGKILL");
      }
    }, 2500).unref();
  };

  process.on("SIGINT", () => {
    cleanup("Ctrl+C");
    process.exitCode = 130;
  });
  process.on("SIGTERM", () => {
    cleanup("SIGTERM");
    process.exitCode = 143;
  });
  process.on("exit", () => cleanup("process exit"));

  console.log("Building project...");
  await runBuild();

  console.log(`Starting local server on ${localUrl}...`);
  const server = spawn(process.execPath, ["dist/index.js"], {
    env: {
      ...process.env,
      REMOTE_CONTROL_PORT: String(options.port),
      REMOTE_CONTROL_PAIRING_CODE_LENGTH: "12",
      REMOTE_CONTROL_PAIRING_TTL_SECONDS: String(pairingTtlSeconds),
      REMOTE_CONTROL_TOKEN_TTL_SECONDS: String(ttlSeconds),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.push(server);

  const pairingMatch = await waitForPattern(server, /Pairing code: ([0-9]{12})/, "local server");
  pipeAfterReady(server);

  console.log(`Starting Cloudflare quick tunnel for ${localUrl}...`);
  const tunnel = spawn("cloudflared", ["tunnel", "--url", localUrl], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.push(tunnel);

  const urlMatch = await waitForPattern(tunnel, /(https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com)/, "cloudflared");
  pipeAfterReady(tunnel);

  console.log(`
Remote quick access is ready.

Phone URL:
  ${urlMatch[1]}

Pairing code:
  ${pairingMatch[1]}

Auto-stop:
  ${formatDuration(options.ttlMs)} (${expiresAt.toLocaleString()})

Notes:
  - Keep this terminal open while using the tunnel.
  - Phone can be on mobile data; the computer remains the execution environment.
  - The pairing code expires in ${formatDuration(pairingTtlSeconds * 1000)}.
  - Press Ctrl+C to stop immediately.
`);

  setTimeout(() => cleanup("TTL expired"), options.ttlMs).unref();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
