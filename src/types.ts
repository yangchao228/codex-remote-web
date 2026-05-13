export type SessionStatus = "running" | "stopping" | "completed" | "failed" | "stopped";

export type StreamKind = "stdout" | "stderr" | "system";

export interface AppConfig {
  host: string;
  port: number;
  allowLan: boolean;
  workspaceAllowlist: string[];
  codexBin: string;
  codexExtraArgs: string[];
  promptMaxLength: number;
  tokenTtlMs: number;
  pairingCodeTtlMs: number;
  dataDir: string;
}

export interface SessionRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  workspace: string;
  promptSummary: string;
  status: SessionStatus;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  logPath: string;
}

export interface StreamEvent {
  id: string;
  sessionId: string;
  at: string;
  kind: StreamKind;
  text: string;
}

export interface RunnerStartOptions {
  id: string;
  workspace: string;
  prompt: string;
  onEvent: (event: Omit<StreamEvent, "id" | "sessionId" | "at">) => void;
  onExit: (exitCode: number | null, signal: NodeJS.Signals | null) => void;
}

export interface RunningProcess {
  stop: () => void;
}
