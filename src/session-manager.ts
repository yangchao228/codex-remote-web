import crypto from "node:crypto";
import { AuditLog } from "./audit.js";
import { CodexRunner } from "./runner.js";
import { sanitizeForBrowser, summarizePrompt } from "./security.js";
import { SessionRecord, StreamEvent, RunningProcess } from "./types.js";

type Subscriber = (event: StreamEvent) => void;

export class SessionManager {
  private sessions = new Map<string, SessionRecord>();
  private activeProcess: RunningProcess | null = null;
  private activeSessionId: string | null = null;
  private subscribers = new Map<string, Set<Subscriber>>();

  constructor(
    private readonly runner: CodexRunner,
    private readonly audit: AuditLog,
  ) {}

  async restoreFromAudit(): Promise<number> {
    const records = await this.audit.readLatestSessions();
    for (const record of records) {
      const recovered = { ...record };
      if (recovered.status === "running" || recovered.status === "stopping") {
        recovered.status = "failed";
        recovered.updatedAt = new Date().toISOString();
      }
      this.sessions.set(recovered.id, recovered);
    }
    return records.length;
  }

  listSessions(): SessionRecord[] {
    return Array.from(this.sessions.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getSession(id: string): SessionRecord | null {
    return this.sessions.get(id) ?? null;
  }

  hasActiveSession(): boolean {
    return this.activeProcess !== null;
  }

  async readEvents(id: string): Promise<StreamEvent[]> {
    return this.audit.readStreamEvents(id);
  }

  async createSession(workspace: string, prompt: string): Promise<SessionRecord> {
    if (this.activeProcess) {
      throw new Error("Only one active Codex process is allowed in MVP");
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const record: SessionRecord = {
      id,
      createdAt: now,
      updatedAt: now,
      workspace,
      promptSummary: summarizePrompt(prompt),
      status: "running",
      exitCode: null,
      signal: null,
      logPath: this.audit.sessionLogPath(id),
    };

    this.sessions.set(id, record);
    await this.audit.appendSession(record);
    await this.emit(id, "system", "Session created. Starting controlled Codex runner.\n");

    this.activeSessionId = id;
    this.activeProcess = this.runner.start({
      id,
      workspace,
      prompt,
      onEvent: (event) => {
        void this.emit(id, event.kind, event.text);
      },
      onExit: (exitCode, signal) => {
        void this.finishSession(id, exitCode, signal);
      },
    });

    return record;
  }

  async stopSession(id: string): Promise<void> {
    const record = this.sessions.get(id);
    if (!record) throw new Error("Session not found");
    if (this.activeSessionId !== id || !this.activeProcess) {
      throw new Error("Session is not running");
    }

    record.status = "stopping";
    record.updatedAt = new Date().toISOString();
    await this.audit.appendSession(record);
    await this.emit(id, "system", "Stop requested. Terminating Codex process group.\n");
    this.activeProcess.stop();
  }

  subscribe(id: string, subscriber: Subscriber): () => void {
    const set = this.subscribers.get(id) ?? new Set<Subscriber>();
    set.add(subscriber);
    this.subscribers.set(id, set);
    return () => {
      set.delete(subscriber);
      if (set.size === 0) this.subscribers.delete(id);
    };
  }

  private async finishSession(
    id: string,
    exitCode: number | null,
    signal: NodeJS.Signals | null,
  ): Promise<void> {
    const record = this.sessions.get(id);
    if (!record) return;

    record.status = record.status === "stopping" ? "stopped" : exitCode === 0 ? "completed" : "failed";
    record.exitCode = exitCode;
    record.signal = signal;
    record.updatedAt = new Date().toISOString();

    if (this.activeSessionId === id) {
      this.activeProcess = null;
      this.activeSessionId = null;
    }

    await this.emit(id, "system", `Session finished with status ${record.status}.\n`);
    await this.audit.appendSession(record);
  }

  private async emit(sessionId: string, kind: StreamEvent["kind"], text: string): Promise<void> {
    const event: StreamEvent = {
      id: crypto.randomUUID(),
      sessionId,
      at: new Date().toISOString(),
      kind,
      text: sanitizeForBrowser(text),
    };

    await this.audit.appendStreamEvent(event);
    const subscribers = this.subscribers.get(sessionId);
    if (!subscribers) return;
    for (const subscriber of subscribers) {
      subscriber(event);
    }
  }
}
