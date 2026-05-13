import path from "node:path";
import { AppConfig } from "./types.js";

function readNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function readBoolean(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (!raw) return fallback;
  return raw === "1" || raw.toLowerCase() === "true";
}

function readList(name: string, fallback: string[]): string[] {
  const raw = process.env[name];
  if (!raw) return fallback;
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function loadConfig(): AppConfig {
  const host = process.env.REMOTE_CONTROL_HOST ?? "127.0.0.1";
  const allowLan = readBoolean("REMOTE_CONTROL_ALLOW_LAN", false);

  if (!allowLan && host !== "127.0.0.1" && host !== "localhost") {
    throw new Error("LAN binding requires REMOTE_CONTROL_ALLOW_LAN=true");
  }

  const workspaceAllowlist = readList("REMOTE_CONTROL_WORKSPACES", [process.cwd()]).map((item) =>
    path.resolve(item),
  );

  return {
    host,
    port: readNumber("REMOTE_CONTROL_PORT", 4317),
    allowLan,
    workspaceAllowlist,
    codexBin: process.env.REMOTE_CONTROL_CODEX_BIN ?? "codex",
    codexExtraArgs: readList("REMOTE_CONTROL_CODEX_EXTRA_ARGS", []),
    promptMaxLength: readNumber("REMOTE_CONTROL_PROMPT_MAX_LENGTH", 8000),
    tokenTtlMs: readNumber("REMOTE_CONTROL_TOKEN_TTL_SECONDS", 60 * 60) * 1000,
    pairingCodeTtlMs: readNumber("REMOTE_CONTROL_PAIRING_TTL_SECONDS", 10 * 60) * 1000,
    dataDir: path.resolve(process.env.REMOTE_CONTROL_DATA_DIR ?? "data"),
  };
}
