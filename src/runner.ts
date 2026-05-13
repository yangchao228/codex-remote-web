import { spawn, ChildProcessWithoutNullStreams } from "node:child_process";
import { AppConfig, RunnerStartOptions, RunningProcess } from "./types.js";
import { sanitizeForBrowser } from "./security.js";

export interface CommandSpec {
  file: string;
  args: string[];
  cwd: string;
  shell: false;
  detached: true;
}

export function buildCodexCommand(config: AppConfig, workspace: string): CommandSpec {
  return {
    file: config.codexBin,
    args: [
      "exec",
      "--skip-git-repo-check",
      "--sandbox",
      "read-only",
      "-C",
      workspace,
      "--json",
      ...config.codexExtraArgs,
      "-",
    ],
    cwd: workspace,
    shell: false,
    detached: true,
  };
}

export class CodexRunner {
  constructor(private readonly config: AppConfig) {}

  start(options: RunnerStartOptions): RunningProcess {
    const command = buildCodexCommand(this.config, options.workspace);
    const child = spawn(command.file, command.args, {
      cwd: command.cwd,
      shell: command.shell,
      detached: command.detached,
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.pipeOutput(child, "stdout", options);
    this.pipeOutput(child, "stderr", options);

    child.on("error", (error) => {
      options.onEvent({ kind: "system", text: `Runner failed to start: ${error.message}` });
    });

    child.on("close", (exitCode, signal) => {
      options.onExit(exitCode, signal);
    });

    child.stdin.write(options.prompt);
    child.stdin.end();

    return {
      stop: () => {
        if (child.pid) {
          try {
            process.kill(-child.pid, "SIGTERM");
          } catch {
            child.kill("SIGTERM");
          }

          setTimeout(() => {
            if (!child.killed && child.pid) {
              try {
                process.kill(-child.pid, "SIGKILL");
              } catch {
                child.kill("SIGKILL");
              }
            }
          }, 2500).unref();
        }
      },
    };
  }

  private pipeOutput(
    child: ChildProcessWithoutNullStreams,
    kind: "stdout" | "stderr",
    options: RunnerStartOptions,
  ): void {
    child[kind].setEncoding("utf8");
    child[kind].on("data", (chunk: string) => {
      options.onEvent({ kind, text: sanitizeForBrowser(chunk) });
    });
  }
}
