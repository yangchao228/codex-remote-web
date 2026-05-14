import os from "node:os";
import { AuditLog } from "./audit.js";
import { AuthService } from "./auth.js";
import { loadConfig } from "./config.js";
import { createServer } from "./http.js";
import { CodexRunner } from "./runner.js";
import { SessionManager } from "./session-manager.js";

function getLanUrls(port: number): string[] {
  return Object.values(os.networkInterfaces())
    .flatMap((items) => items ?? [])
    .filter((item) => item.family === "IPv4" && !item.internal)
    .map((item) => `http://${item.address}:${port}`);
}

async function main(): Promise<void> {
  const config = loadConfig();
  const audit = new AuditLog(config.dataDir);
  await audit.init();

  const auth = new AuthService(config.tokenTtlMs, config.pairingCodeTtlMs);
  const runner = new CodexRunner(config);
  const sessions = new SessionManager(runner, audit);
  const restoredSessionCount = await sessions.restoreFromAudit();
  const server = createServer(config, auth, sessions);

  server.listen(config.port, config.host, () => {
    const pairing = auth.getPairingState();
    console.log(`Codex Remote Control listening on http://${config.host}:${config.port}`);
    console.log(`Security mode: ${config.allowLan ? "LAN enabled" : "localhost only"}`);
    if (config.allowLan) {
      console.warn("LAN mode is enabled. Use only on a trusted network.");
      console.warn("LAN clients cannot refresh or reveal pairing codes; use the localhost page on this computer.");
      console.log(`Local URL: http://127.0.0.1:${config.port}`);
      const lanUrls = getLanUrls(config.port);
      console.log(`LAN URL${lanUrls.length === 1 ? "" : "s"}: ${lanUrls.length ? lanUrls.join(", ") : "none detected"}`);
    }
    console.log(`Workspace allowlist: ${config.workspaceAllowlist.join(", ")}`);
    console.log(`Restored sessions: ${restoredSessionCount}`);
    console.log(`Pairing code: ${pairing.code}`);
    console.log(`Pairing expires at: ${new Date(pairing.expiresAt).toISOString()}`);
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
