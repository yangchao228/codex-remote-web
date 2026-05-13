import fs from "node:fs/promises";
import path from "node:path";
import { SessionRecord, SessionStatus, StreamEvent } from "./types.js";

interface AuditLine {
  at: string;
  type: string;
  payload: unknown;
}

const SESSION_STATUSES: ReadonlySet<string> = new Set([
  "running",
  "stopping",
  "completed",
  "failed",
  "stopped",
]);

export class AuditLog {
  private readonly auditPath: string;
  private readonly logsDir: string;

  constructor(private readonly dataDir: string) {
    this.auditPath = path.join(dataDir, "audit.jsonl");
    this.logsDir = path.join(dataDir, "logs");
  }

  async init(): Promise<void> {
    await fs.mkdir(this.logsDir, { recursive: true });
  }

  sessionLogPath(sessionId: string): string {
    return path.join(this.logsDir, `${sessionId}.jsonl`);
  }

  async appendAudit(type: string, payload: unknown): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
    await fs.appendFile(
      this.auditPath,
      `${JSON.stringify({ at: new Date().toISOString(), type, payload })}\n`,
      "utf8",
    );
  }

  async appendSession(record: SessionRecord): Promise<void> {
    await this.appendAudit("session", record);
  }

  async appendStreamEvent(event: StreamEvent): Promise<void> {
    await fs.appendFile(this.sessionLogPath(event.sessionId), `${JSON.stringify(event)}\n`, "utf8");
  }

  async readStreamEvents(sessionId: string): Promise<StreamEvent[]> {
    try {
      const raw = await fs.readFile(this.sessionLogPath(sessionId), "utf8");
      return raw
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as StreamEvent);
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  async readLatestSessions(): Promise<SessionRecord[]> {
    let raw = "";
    try {
      raw = await fs.readFile(this.auditPath, "utf8");
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        return [];
      }
      throw error;
    }

    const latest = new Map<string, SessionRecord>();
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      const auditLine = this.parseAuditLine(line);
      if (!auditLine || auditLine.type !== "session") continue;
      const record = this.parseSessionRecord(auditLine.payload);
      if (record) latest.set(record.id, record);
    }
    return Array.from(latest.values());
  }

  private parseAuditLine(line: string): AuditLine | null {
    try {
      const parsed = JSON.parse(line) as Partial<AuditLine>;
      if (typeof parsed.at !== "string" || typeof parsed.type !== "string") return null;
      return { at: parsed.at, type: parsed.type, payload: parsed.payload };
    } catch {
      return null;
    }
  }

  private parseSessionRecord(payload: unknown): SessionRecord | null {
    if (!payload || typeof payload !== "object") return null;
    const candidate = payload as Partial<SessionRecord>;
    if (
      typeof candidate.id !== "string" ||
      typeof candidate.createdAt !== "string" ||
      typeof candidate.updatedAt !== "string" ||
      typeof candidate.workspace !== "string" ||
      typeof candidate.promptSummary !== "string" ||
      typeof candidate.status !== "string" ||
      !SESSION_STATUSES.has(candidate.status) ||
      typeof candidate.logPath !== "string"
    ) {
      return null;
    }

    return {
      id: candidate.id,
      createdAt: candidate.createdAt,
      updatedAt: candidate.updatedAt,
      workspace: candidate.workspace,
      promptSummary: candidate.promptSummary,
      status: candidate.status as SessionStatus,
      exitCode: typeof candidate.exitCode === "number" ? candidate.exitCode : null,
      signal: typeof candidate.signal === "string" ? (candidate.signal as NodeJS.Signals) : null,
      logPath: candidate.logPath,
    };
  }
}
