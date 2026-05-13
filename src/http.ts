import http, { IncomingMessage, ServerResponse } from "node:http";
import { AppConfig } from "./types.js";
import { AuthService } from "./auth.js";
import { SessionManager } from "./session-manager.js";
import { resolveAllowedWorkspace } from "./workspace.js";
import { htmlPage } from "./static-page.js";

interface JsonRequest {
  prompt?: unknown;
  workspace?: unknown;
  code?: unknown;
}

function sendJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(payload));
}

function sendError(response: ServerResponse, statusCode: number, message: string): void {
  sendJson(response, statusCode, { error: message });
}

async function readJson(request: IncomingMessage): Promise<JsonRequest> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    if (Buffer.concat(chunks).byteLength > 1024 * 1024) {
      throw new Error("Request body is too large");
    }
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as JsonRequest;
}

function requireAuth(request: IncomingMessage, response: ServerResponse, auth: AuthService): boolean {
  if (auth.verifyBearer(request.headers.authorization)) return true;
  sendError(response, 401, "Authentication required");
  return false;
}

function isLoopbackRequest(request: IncomingMessage): boolean {
  const address = request.socket.remoteAddress;
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}

function writeSse(response: ServerResponse, event: string, data: unknown): void {
  response.write(`event: ${event}\n`);
  response.write(`data: ${JSON.stringify(data)}\n\n`);
}

function isTerminalStatus(status: string): boolean {
  return status === "completed" || status === "failed" || status === "stopped";
}

export function createServer(config: AppConfig, auth: AuthService, sessions: SessionManager): http.Server {
  return http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

      if (request.method === "GET" && url.pathname === "/") {
        response.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
          "X-Content-Type-Options": "nosniff",
          "Referrer-Policy": "no-referrer",
          "Cache-Control": "no-store",
        });
        response.end(htmlPage());
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/health") {
        sendJson(response, 200, {
          ok: true,
          host: config.host,
          port: config.port,
          allowLan: config.allowLan,
          localPairingCodeAvailable: !config.allowLan,
          workspaces: config.workspaceAllowlist,
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/local-pairing-code") {
        if (config.allowLan || !isLoopbackRequest(request)) {
          sendError(response, 403, "Pairing code can only be shown on localhost when LAN mode is disabled");
          return;
        }
        const pairing = auth.rotatePairingCode();
        sendJson(response, 200, {
          code: pairing.code,
          expiresAt: new Date(pairing.expiresAt).toISOString(),
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/pair") {
        const body = await readJson(request);
        if (typeof body.code !== "string") {
          sendError(response, 400, "Pairing code is required");
          return;
        }
        const paired = auth.pair(body.code);
        sendJson(response, 200, {
          token: paired.token,
          expiresAt: new Date(paired.expiresAt).toISOString(),
          workspaces: config.workspaceAllowlist,
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/revoke") {
        if (!requireAuth(request, response, auth)) return;
        auth.revokeAll();
        sendJson(response, 200, { ok: true });
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/tasks") {
        if (!requireAuth(request, response, auth)) return;
        sendJson(response, 200, { sessions: sessions.listSessions() });
        return;
      }

      const detailMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)$/);
      if (request.method === "GET" && detailMatch) {
        if (!requireAuth(request, response, auth)) return;
        const id = detailMatch[1] ?? "";
        const session = sessions.getSession(id);
        if (!session) {
          sendError(response, 404, "Session not found");
          return;
        }
        sendJson(response, 200, {
          session,
          events: await sessions.readEvents(id),
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/tasks") {
        if (!requireAuth(request, response, auth)) return;
        const body = await readJson(request);
        if (typeof body.prompt !== "string" || body.prompt.trim().length === 0) {
          sendError(response, 400, "Prompt is required");
          return;
        }
        if (body.prompt.length > config.promptMaxLength) {
          sendError(response, 400, `Prompt must be ${config.promptMaxLength} characters or less`);
          return;
        }
        const requestedWorkspace = typeof body.workspace === "string" ? body.workspace : undefined;
        const workspace = await resolveAllowedWorkspace(requestedWorkspace, config.workspaceAllowlist);
        const session = await sessions.createSession(workspace, body.prompt);
        sendJson(response, 201, { session });
        return;
      }

      const stopMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)\/stop$/);
      if (request.method === "POST" && stopMatch) {
        if (!requireAuth(request, response, auth)) return;
        await sessions.stopSession(stopMatch[1] ?? "");
        sendJson(response, 200, { ok: true });
        return;
      }

      const streamMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)\/stream$/);
      if (request.method === "GET" && streamMatch) {
        if (!requireAuth(request, response, auth)) return;
        const id = streamMatch[1] ?? "";
        const session = sessions.getSession(id);
        if (!session) {
          sendError(response, 404, "Session not found");
          return;
        }

        response.writeHead(200, {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-store",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        });
        writeSse(response, "session", session);
        for (const event of await sessions.readEvents(id)) {
          writeSse(response, "message", event);
        }
        if (isTerminalStatus(session.status)) {
          response.end();
          return;
        }
        let unsubscribe = (): void => undefined;
        unsubscribe = sessions.subscribe(id, (event) => {
          writeSse(response, "message", event);
          const current = sessions.getSession(id);
          if (current && isTerminalStatus(current.status)) {
            writeSse(response, "session", current);
            unsubscribe();
            response.end();
          }
        });
        request.on("close", unsubscribe);
        return;
      }

      sendError(response, 404, "Not found");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      sendError(response, 500, message);
    }
  });
}
