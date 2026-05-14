# Codex CLI Remote Control

[中文](README.md) | English

A safer local AI workstation where your phone acts only as the control panel.

Codex CLI is already useful for reading code, changing code, and running tests on your computer. In real use, there is a small but persistent problem: after a task starts, you may leave your desk, but you still need to know whether it finished, what it printed, and whether you should stop it.

`codex-cli-remote-control` is built for that workflow. The phone is only a browser-based control panel. Your computer remains the execution environment. Codex CLI still runs locally.

![Phone connected to Codex on the computer in LAN mode](https://images.reai.group/images/0552991e828f60aa-lan-mode.jpg)

## One-Line Summary

Control Codex CLI on your computer from a mobile browser: submit tasks, watch live output, stop execution, and replay history, without turning your computer into an exposed remote shell.

## Boundaries

Your phone should not have full control over your computer.

That is why the first version deliberately keeps the capability surface narrow:

- The phone cannot run arbitrary shell commands.
- The phone cannot choose arbitrary executable paths.
- The phone cannot read the computer's filesystem directly.
- The phone cannot pass process environment variables.
- The phone can only select allowlisted workspaces.
- Localhost access is the default.
- LAN access must be explicitly enabled.
- Task records and output logs stay on the computer.

This is a remote-control tool, but it behaves more like a task console. It does not give the phone remote root access.

## Current Features

- Local Web control panel
- 6-digit pairing code shown in the computer terminal
- Workspace selection from an allowlist
- Codex task submission from the phone
- Controlled `codex exec` process on the computer
- Live output streaming on the phone
- Stop button for the active task
- Recent task list
- Historical task output replay
- Local JSONL audit records
- Trusted LAN mode

## Preview

The phone UI is a lightweight control panel: pair with the computer, choose a workspace, submit a task, watch Codex output, and replay task history.

| Pairing And Connection | Submit Task And Watch Output | History And Status |
| --- | --- | --- |
| <img src="https://images.reai.group/images/dd93b3bbc3de7e84-1.jpg" alt="Phone pairing and connection status" width="260"> | <img src="https://images.reai.group/images/598cd2e03b5496bf-phone-task-output.jpg" alt="Submit a Codex task and watch output on the phone" width="260"> | <img src="https://images.reai.group/images/a4e9becf576ddb05-3.jpg" alt="Recent tasks and status on the phone" width="260"> |

## Usage

### Lowest-Friction Start

If you do not want to read the code or installation instructions first, download this GitHub project locally, start Codex in the project root, and tell it:

```text
Start this project for me
```

Codex can read the project structure, `package.json`, and README, then install dependencies, build, and start the service. You only need to open the printed URL and enter the pairing code from the computer terminal.

This keeps the first-run cost low: no need to understand the code first, and no need to read the full installation guide before trying it. On the first run, still check the printed access URL, LAN-mode warning, and 6-digit pairing code.

### Manual Start

Install dependencies and build:

```bash
npm install
npm run build
```

Run in local mode:

```bash
npm run start
```

Run in LAN mode:

```bash
npm run start:lan
```

After startup, check the terminal output. In localhost mode, open the local URL. In LAN mode, open the printed LAN URL from your phone on the same trusted Wi-Fi.

The page will ask for a pairing code. Read the code from the computer terminal.

## Configure Workspaces

By default, Codex can only run in the current directory. You can allow multiple workspaces with an environment variable:

```bash
REMOTE_CONTROL_WORKSPACES=/Users/me/project-a,/Users/me/project-b npm run start
```

Default Codex command:

```bash
codex exec --skip-git-repo-check --sandbox read-only -C <allowed-workspace> --json -
```

To use a custom Codex executable:

```bash
REMOTE_CONTROL_CODEX_BIN=/path/to/codex npm run start
```

## Commands

| Command | Description |
| --- | --- |
| `npm run build` | Compile TypeScript |
| `npm run lint` | Type check |
| `npm test` | Run tests |
| `npm run start` | Start in local mode |
| `npm run start:lan` | Start in LAN mode |
| `npm run smoke:local` | Smoke test with the mock runner |
| `npm run smoke:codex` | Smoke test with the real Codex CLI runner |
| `npm run smoke:lan` | Smoke test for LAN mode |

## Why Not Just SSH?

SSH is powerful, but it gives you a full machine entry point.

This project has a narrower goal: expose only the actions needed to submit a Codex task, watch output, and stop the active task. Most of the time, you do not need a full terminal on your phone. You need task visibility and a way to make decisions when needed.

Human judgment stays in the control panel. Execution stays on the computer.

## Roadmap

Near-term priorities:

- Task templates: turn common Codex workflows like "review this branch", "fix this error", "add tests", and "explain this code" into reusable tasks.
- Task history as an asset: make every Codex run searchable, reviewable, and reusable.
- Better mobile reading: collapse long output, highlight important parts, and make failed states easier to inspect.
- Multi-project workspace: configure aliases, default parameters, safety policy, and task templates for each workspace, so it is easier to track several projects at once.
- Workspace status dashboard: show recent tasks, running tasks, last result, and history filters by project.
- Local notifications: notify the phone or desktop when a long task completes.
- Safe remote access: allow a phone on mobile data to connect to Codex running on a home or office computer, with device authorization, short-lived tokens, access audit logs, and one-click disconnect.
- Desktop resident entry point: reduce the cost of starting the service every time.
- Stronger security model: document the threat model, permission model, and risks of public exposure.

Longer term, this can become an entry point for a local AI workstation:

- Control more than Codex CLI
- Support more local agent runners
- Support personal workflow templates
- Support trusted-device remote access
- Support long-term task records and review
- Become a self-hosted personal AI operating console

## Who Should Follow This Project?

- You use Codex CLI heavily.
- You want your phone to be a control panel while your computer remains the execution environment.
- You do not want to expose a local agent service directly to the public internet.
- You are building your own AI workflow.
- You care about local-first tools, personal systems, AI workstations, and Human3.0.

If this direction is useful to you, Star / Watch the project. I will keep documenting real usage problems, design tradeoffs, and future iterations.

## Current Status

The MVP is runnable and currently covered by:

- Type checks
- Unit tests
- Mock runner smoke test
- Real Codex CLI smoke test
- LAN mode smoke test

The project is still early. Issues with real scenarios and improvement ideas are welcome.

## License

MIT License. See [LICENSE](LICENSE).
