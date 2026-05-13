# Codex CLI Remote Control MVP

Local-first browser control panel for running controlled Codex CLI tasks on this laptop.

## What It Does

- Serves a mobile-first browser UI from a local Node.js service.
- Uses a laptop-console pairing code before any control action.
- Accepts a user prompt from the browser.
- Runs a controlled `codex exec` subprocess on the laptop.
- Streams sanitized output back to the browser.
- Stops the active Codex process group on request.
- Writes append-only audit and stream logs under `data/`.
- Restores recent task history from `data/audit.jsonl` on startup.
- Replays historical task output from local JSONL log files.

## Safety Boundary

- The browser cannot choose an executable path.
- The browser cannot pass shell commands or process environment variables.
- The browser cannot access the local filesystem directly.
- Workspace selection is limited to `REMOTE_CONTROL_WORKSPACES`.
- The service binds to `127.0.0.1` by default.
- Bearer tokens are held in browser memory and are not placed in URLs.
- The page can refresh a pairing code only from localhost when LAN mode is disabled.

## Run Locally

```bash
npm install
npm run build
npm run start
```

Open the printed local URL, then enter the pairing code printed in the laptop terminal.

## Run On LAN

Use LAN mode only on a trusted private network.

```bash
npm run build
npm run start:lan
```

The service binds to `0.0.0.0` and prints detected LAN URLs such as:

```text
LAN URL: http://192.168.1.23:4317
```

Open that URL from a phone on the same Wi-Fi. In LAN mode, the page cannot refresh or reveal pairing codes. Read the pairing code from the laptop terminal and enter it on the phone.

LAN mode keeps the same execution boundary:

- Codex runs on the laptop.
- Logs stay on the laptop.
- The phone cannot choose an executable path, shell command, environment variable, or arbitrary workspace.
- Public tunnel mode is not enabled.

## Configuration

Environment variables:

- `REMOTE_CONTROL_HOST`: default `127.0.0.1`
- `REMOTE_CONTROL_PORT`: default `4317`
- `REMOTE_CONTROL_ALLOW_LAN`: set `true` to allow non-localhost binding
- `REMOTE_CONTROL_WORKSPACES`: comma-separated allowlist, default current directory
- `REMOTE_CONTROL_CODEX_BIN`: default `codex`
- `REMOTE_CONTROL_CODEX_EXTRA_ARGS`: comma-separated extra args appended before prompt stdin marker
- `REMOTE_CONTROL_PROMPT_MAX_LENGTH`: default `8000`
- `REMOTE_CONTROL_DATA_DIR`: default `data`

Default Codex command shape:

```bash
codex exec --skip-git-repo-check --sandbox read-only -C <allowed-workspace> --json -
```

The prompt is written to stdin. It is not concatenated into a shell command.

## Validation

Static validation:

```bash
npm run lint
npm test
```

Smoke validation with the included mock runner:

```bash
REMOTE_CONTROL_PORT=4321 \
REMOTE_CONTROL_CODEX_BIN=/Users/yangchao/work/codex/remote-control/scripts/mock-codex.mjs \
npm run start
```

Then, in another terminal, either omit `PAIRING_CODE` to let the smoke script use the localhost-only pairing-code endpoint, or pass the printed pairing code explicitly:

```bash
SMOKE_BASE_URL=http://127.0.0.1:4321 \
npm run smoke:local
```

Smoke validation with the real Codex CLI runner:

```bash
REMOTE_CONTROL_PORT=4322 npm run start
```

Then, in another terminal:

```bash
SMOKE_BASE_URL=http://127.0.0.1:4322 \
npm run smoke:codex
```

`smoke:codex` creates one read-only prompt through the local service, waits for streamed output containing `REMOTE_CONTROL_OK`, and verifies the local log path exists.

LAN validation:

```bash
npm run start:lan
```

Then use the printed laptop pairing code:

```bash
SMOKE_BASE_URL=http://127.0.0.1:4317 \
PAIRING_CODE=<printed-code> \
npm run smoke:lan
```

`smoke:lan` verifies LAN mode is enabled, the localhost-only pairing-code endpoint is disabled, a paired task can run, and replay logs are readable.
