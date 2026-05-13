import { AuditLog } from "./audit.js";
import { AuthService } from "./auth.js";
import { loadConfig } from "./config.js";
import { createServer } from "./http.js";
import { CodexRunner } from "./runner.js";
import { SessionManager } from "./session-manager.js";

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
      console.warn("LAN mode is enabled. Only use it on a trusted network after pairing is understood.");
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
