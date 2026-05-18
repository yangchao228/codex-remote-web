# Codex CLI Remote Control MVP Todo

## Current State Review

- Workspace: `/Users/yangchao/work/codex/remote-control`
- Current state: runnable Node.js + TypeScript MVP implemented.
- Git repository initialized.
- Source-code changes: local HTTP service, mobile browser UI, pairing auth, controlled Codex runner, SSE stream, stop control, append-only local logs, tests, and smoke script.

## Objective

Build a safe local-first remote-control MVP for Codex CLI.

Core boundary:

- The laptop remains the only execution environment.
- The phone is only a browser-based control panel.
- The phone must never receive shell access, local filesystem access, API keys, or arbitrary execution capability.

## Architecture Plan

### 1. Local Laptop Agent

Run a local web service on the laptop. This service owns all access to Codex CLI and local project state.

Responsibilities:

- Start and monitor Codex CLI sessions on the laptop.
- Expose a narrow HTTP/WebSocket API for the phone UI.
- Keep all process execution local.
- Store session logs and minimal metadata locally.
- Enforce authentication, authorization, rate limits, and command boundaries.

Recommended MVP shape:

- Backend: Node.js + TypeScript.
- Server: Fastify or Hono.
- Realtime channel: WebSocket or Server-Sent Events.
- Process control: `child_process.spawn` with explicit argument construction.
- Local storage: SQLite or append-only JSONL files.

For MVP, prefer append-only JSONL if the data model stays simple. Move to SQLite only when querying sessions, tasks, or audit history becomes painful.

### 2. Browser Control Panel

Serve a mobile-first web UI from the laptop service.

Responsibilities:

- Show connection status.
- Show active Codex session status.
- Submit user-approved prompts/tasks.
- Stream Codex output.
- Provide explicit stop/cancel controls.
- Show recent session history.

Phone-side constraints:

- No direct terminal.
- No arbitrary shell command input.
- No file browser in MVP.
- No secret display.
- No persistent auth token in URL.

### 3. Network Model

Default to local network only.

MVP access modes, in order:

1. `localhost` for development.
2. LAN IP binding after auth is in place.
3. Optional tunnel only after MVP security review.

Do not expose the service publicly by default.

### 4. Codex Execution Model

The backend should treat Codex CLI as a controlled subprocess.

Allowed MVP operations:

- Create a session from a user prompt.
- Stream stdout/stderr to the UI.
- Send follow-up input only through the backend's controlled channel.
- Stop the running process.
- Persist output locally.

Disallowed MVP operations:

- Arbitrary shell command execution from the phone.
- User-provided executable path.
- User-provided working directory outside configured allowlist.
- Remote file upload that is automatically executed.
- Silent background execution after phone disconnect without visible state.

### 5. Workspace Allowlist

Use an explicit allowlist of directories the laptop service can operate in.

Initial config example:

- `/Users/yangchao/work/codex/remote-control`

Rules:

- Resolve real paths before use.
- Reject symlinks escaping the allowlist.
- Reject relative paths that normalize outside the allowlist.
- Display the active workspace clearly in the phone UI.

### 6. State And Audit Trail

Persist enough local state to support review and recovery.

MVP records:

- Session ID
- Created time
- Workspace
- Prompt summary
- Process status
- Exit code
- Output log path
- Stop/cancel event

Avoid storing:

- Secrets
- Full environment variables
- Browser auth tokens
- Long-lived private keys

## Security Checklist

### Authentication

- [x] Require authentication before any control action.
- [x] Use a local pairing flow for MVP.
- [x] Generate a one-time pairing code on the laptop console.
- [x] Exchange pairing code for a short-lived session token.
- [x] Store only a hashed token server-side if persistence is needed.
- [x] Expire inactive phone sessions through short-lived tokens.
- [x] Provide a laptop-side command or UI action to revoke all phone sessions.

### Authorization

- [x] Phone can only call documented control APIs.
- [x] Phone cannot choose arbitrary executable paths.
- [x] Phone cannot directly set process environment variables.
- [x] Phone cannot disable safety checks.
- [x] Backend validates workspace against allowlist for every request.

### Network Exposure

- [x] Bind to `127.0.0.1` by default.
- [x] Require an explicit flag before binding to LAN.
- [x] Print the active bind address and access URL at startup.
- [x] Warn when LAN mode is enabled.
- [x] Do not enable public tunnel mode in MVP.
- [x] Add remote-access hardening for tunnel use: configurable longer pairing codes and invalid pairing attempt limits.
- [x] Document mobile-data remote access through a private network or protected tunnel without router port forwarding.

### Input Safety

- [x] Treat all phone input as untrusted.
- [x] Validate request schema with Zod or equivalent.
- [x] Cap prompt length.
- [x] Cap session count and concurrent process count.
- [x] Sanitize terminal control sequences before rendering in browser.
- [x] Never concatenate user input into shell strings.
- [x] Use `spawn(file, args, { shell: false })`.

### Secret Handling

- [x] Never send environment variables to the phone.
- [x] Redact likely tokens from streamed output before browser rendering.
- [x] Keep auth tokens out of URLs.
- [x] Add `.gitignore` entries for local logs, tokens, and runtime state when a git repo is initialized.

### Process Control

- [x] Only one active Codex process in MVP unless explicitly expanded.
- [x] Provide stop/cancel from phone.
- [x] Kill the child process group on cancel.
- [x] Record exit status.
- [x] Avoid orphaned background processes.

### Browser Security

- [x] Set strict Content Security Policy.
- [x] Set secure same-origin defaults where applicable.
- [x] Avoid third-party scripts in MVP.
- [x] Use CSRF protection if cookie-based auth is used. Not applicable in MVP because auth is bearer-token based, not cookie-based.
- [x] Prefer bearer session token in memory for mobile web MVP.

## Implementation Checklist

Implementation started on 2026-05-12 after approval to proceed with the MVP.

### Phase 1: Project Skeleton

- [x] Initialize git repository if desired.
- [x] Add TypeScript project structure.
- [x] Add package scripts for `dev`, `build`, `lint`, and `test`.
- [x] Add `.gitignore`.
- [x] Add config module for bind host, port, workspace allowlist, and Codex binary path.

### Phase 2: Local Server

- [x] Add health endpoint.
- [x] Add pairing endpoint.
- [x] Add authenticated session middleware.
- [x] Add structured request validation.
- [x] Add local audit logger.

### Phase 3: Codex Process Runner

- [x] Implement controlled Codex subprocess runner.
- [x] Use explicit argv construction.
- [x] Stream output events to subscribers.
- [x] Implement stop/cancel.
- [x] Persist session metadata and logs locally.
- [x] Add unit tests for path allowlist and process command construction.

### Phase 4: Phone Control UI

- [x] Build mobile-first web UI.
- [x] Add pairing screen.
- [x] Add session creation form.
- [x] Add live output stream.
- [x] Add stop/cancel button.
- [x] Add recent sessions list.
- [x] Add clear status and error messages.

### Phase 5: End-To-End MVP

- [x] Run server locally.
- [x] Pair phone browser with laptop service.
- [x] Start a Codex task from the phone.
- [x] Confirm execution happens on laptop.
- [x] Stream output back to phone.
- [x] Cancel a running task.
- [x] Confirm logs remain local.

### Phase 6: Mobile Data Remote Access

- [x] Add remote-hardened start mode with 12-digit pairing code, shorter pairing lifetime, shorter token lifetime, and invalid pairing attempt limits.
- [x] Add mobile-data remote access runbook for private network or protected tunnel usage.
- [x] Choose and approve the real remote-access path: private VPN/Tailscale, protected Cloudflare Tunnel, or a short-lived quick tunnel demo.
- [x] Verify from a phone with Wi-Fi disabled against the chosen tunnel or private network URL.
- [x] Record final mobile-data demo evidence.

## Validation Steps

### Static Validation

- [x] `npm run lint`
- [x] `npm run build`
- [x] `npm test`

### Security Validation

- [x] Unauthenticated request cannot create a Codex session.
- [x] Expired token cannot create a Codex session.
- [x] Invalid workspace path is rejected.
- [x] Symlink escape from allowlist is rejected.
- [x] Prompt over length limit is rejected.
- [x] User input cannot alter executable path.
- [x] User input cannot inject shell metacharacters into process execution.
- [x] Streamed output redacts likely secrets.

### Runtime Validation

- [x] Server starts on `127.0.0.1` by default.
- [x] LAN binding requires explicit config.
- [x] Startup logs show access URL and security mode.
- [x] Phone UI can pair through local code.
- [x] Phone UI can submit a prompt.
- [x] Laptop starts the Codex process.
- [x] Phone receives streamed output.
- [x] Stop button terminates the active process.
- [x] Session metadata and logs are written locally.

### Manual UX Validation

- [x] The phone UI clearly shows whether it is connected.
- [x] The phone UI clearly shows which laptop workspace is active.
- [x] Dangerous or unsupported actions explain what happened and what to do next.
- [x] The user can stop execution quickly.
- [x] No secret, token, or full environment dump appears in the phone UI.

## Open Decisions Before Implementation

- Node server framework: Node built-in HTTP server for the MVP, to avoid unnecessary runtime dependencies.
- Realtime transport: SSE over authenticated `fetch`, so bearer token is not placed in the URL.
- Local state store: append-only JSONL under `data/`.
- Network scope: localhost-only by default; LAN requires `REMOTE_CONTROL_ALLOW_LAN=true`.
- Codex CLI invocation: `codex exec --skip-git-repo-check --sandbox read-only -C <allowed-workspace> --json -`, with prompt passed through stdin.

## Review Notes

- 2026-05-11: Initial planning document created after inspecting the workspace. The target directory is currently empty and not a git repository. No source code was modified.
- 2026-05-12: Implemented runnable MVP. Validation passed: `npm run lint`, `npm run build`, `npm test`, and `SMOKE_BASE_URL=http://127.0.0.1:4321 PAIRING_CODE=<code> npm run smoke:local` against the mock runner. Smoke covered health, pairing, create task, stream output, stop task, final session status, and local log files.
- 2026-05-12: Verified the default real Codex CLI runner through the local service on `127.0.0.1:4322`. The service paired successfully, created a read-only `codex exec` task, streamed output containing `REMOTE_CONTROL_OK`, reached `completed`, and wrote a local log file.

## Next Step Todo

- [x] Add a reusable real Codex CLI smoke script.
- [x] Restore recent session history from local append-only audit logs on service startup.
- [x] Keep recovered `running` or `stopping` sessions from becoming active after restart.
- [x] Update README with the new real-runner smoke command.
- [x] Re-run lint, build, tests, mock smoke, and real Codex smoke.

## Next Step Review Notes

- 2026-05-12: Added startup session recovery from `data/audit.jsonl`. The service now prints restored session count at startup, and recovered `running` / `stopping` records are marked `failed` in memory so they do not become active after restart.
- 2026-05-12: Added `npm run smoke:codex` for the real Codex CLI runner. Validation passed with `SMOKE_BASE_URL=http://127.0.0.1:4322 PAIRING_CODE=<code> npm run smoke:codex`, producing a completed session and local log path.
- 2026-05-12: Validation passed: `npm run lint`, `npm run build`, `npm test` with 10 tests, `npm run smoke:local`, and `npm run smoke:codex`.

## UI History Replay Todo

- [x] Add authenticated `GET /api/tasks/:id` detail endpoint with session metadata and replay events.
- [x] Make recent task entries clickable in the mobile UI.
- [x] Replay historical output into the output panel from local JSONL events.
- [x] Show status, timestamps, exit code, signal, workspace, and local log path for selected tasks.
- [x] Avoid rendering prompt or workspace text through unsafe HTML interpolation.
- [x] Extend smoke scripts to verify task detail replay events.

## UI History Replay Review Notes

- 2026-05-13: Added clickable history replay in the mobile UI. Selecting a recent task loads session metadata and local JSONL stream events through the authenticated detail API, then renders the historical output without using unsafe HTML interpolation for prompt or workspace text.
- 2026-05-13: Validation passed: `npm run lint`, `npm test`, `npm run smoke:local`, and `npm run smoke:codex`.

## Output Readability Review Notes

- 2026-05-13: Optimized the stream output panel to format common Codex JSONL events into readable text, including session creation, turn start, assistant messages, token usage, completion, stop, and failure states. Local logs still keep the original event text.
- 2026-05-13: Validation passed: `npm run lint`, `npm test`, and `npm run smoke:local`.

## Pairing UX Review Notes

- 2026-05-13: Added a localhost-only `POST /api/local-pairing-code` endpoint and a page button to refresh the pairing code without reading the terminal. The endpoint is disabled when LAN mode is enabled or the request is not from loopback.
- 2026-05-13: Pairing now disables the button while a request is in flight and hides the pairing panel after success, avoiding accidental double-submit errors.

## LAN Mode Todo

- [x] Add explicit `npm run start:lan` and `npm run dev:lan` commands.
- [x] Bind LAN mode to `0.0.0.0` only when `REMOTE_CONTROL_ALLOW_LAN=true`.
- [x] Print local URL, detected LAN URLs, and LAN safety warnings at startup.
- [x] Disable page-visible pairing-code refresh in LAN mode.
- [x] Add `npm run smoke:lan` validation for LAN mode, pairing, real Codex runner, replay logs, and disabled local pairing-code endpoint.
- [x] Document phone usage and LAN security boundary.

## LAN Mode Review Notes

- 2026-05-13: LAN mode verified with `npm run start:lan`. Startup printed local URL and detected LAN URLs. `/api/health` returned `allowLan: true` and `localPairingCodeAvailable: false`.
- 2026-05-13: Verified `POST /api/local-pairing-code` returns 403 in LAN mode, and the page contains logic to disable the refresh button with the LAN warning text.
- 2026-05-13: Validation passed: `npm run lint`, `npm test`, and `SMOKE_BASE_URL=http://127.0.0.1:4317 PAIRING_CODE=<terminal-code> npm run smoke:lan`.

## Multi-Project Workspace Roadmap

- [ ] Add project aliases for configured workspaces so the phone UI does not need to show full local paths.
- [ ] Add a workspace config file such as `remote-control.workspaces.json` for aliases, default Codex args, safety notes, and task templates.
- [ ] Show recent task, running status, last result, and quick actions per workspace.
- [ ] Add history filtering by workspace.
- [ ] Preserve the current allowlist and realpath safety boundary for every workspace selection.
- [ ] Document how to configure multiple projects for users who track several repos at the same time.

## Chinese Open Source README Todo

- [x] Read the current README, package scripts, source capabilities, and existing MVP plan.
- [x] Draft three Chinese README candidates with different positioning.
- [x] Include current capabilities, local/LAN usage, security boundary, validation, and follow-up roadmap.
- [x] Keep the current root README unchanged until the preferred version is selected.
- [x] Review the generated candidates for consistency with the implemented MVP.

## Chinese Open Source README Review Notes

- 2026-05-14: Added three candidate Chinese README drafts under `docs/`: product-oriented, developer-oriented, and story/vision-oriented. The root `README.md` was left unchanged so the preferred version can be selected before replacement.
- 2026-05-14: Clarified that current access is localhost / trusted LAN only, and added safe remote mobile-network access to the roadmap as a future capability rather than a default public exposure mode.
- 2026-05-14: Promoted `docs/README.zh.v3.md` to the root `README.md` as the official Chinese version, added `README.en.md`, and linked the two files for language switching.
- 2026-05-14: Added a WeChat promotional draft at `docs/wechat-promo-codex-remote-web.md`, positioning the project as a safe phone control panel for local Codex CLI and adding follow-up update hooks for official-account subscribers.
- 2026-05-14: Verified current OpenAI Codex official surfaces before strengthening the WeChat opening. The draft now avoids claiming OpenAI has no remote tooling, and instead positions this project as a lightweight mobile-browser control panel for local Codex CLI.
- 2026-05-14: Updated the root Chinese `README.md` to use screenshots from `docs/imgs`, including a LAN-mode hero image and three mobile UI preview images for pairing, task output, and history/status.
- 2026-05-14: Added MIT `LICENSE` and updated README license sections to link to it.
- 2026-05-14: Updated the WeChat promotional draft to include the actual interaction screenshots from `docs/imgs`, with inline captions for LAN mode, pairing, task output, and history/status.
- 2026-05-14: Uploaded the WeChat promotional draft images to Cloudflare R2 and replaced inline image references with `https://images.reai.group/...` URLs so the article can render outside the local repository.
- 2026-05-14: Optimized the WeChat promotional draft structure with clearer section headings, cover summary, stronger title options, and a more scannable flow from official capability gap to demo, safety boundary, usage, roadmap, and follow-up CTA.
- 2026-05-14: Added a low-cost usage tip to the root README and WeChat promotional draft, explaining that users can download the GitHub project locally, start Codex in the project root, and ask Codex to launch the project without first reading the code or full installation instructions.
- 2026-05-14: Added multi-project workspace management to the README roadmap and captured a concrete roadmap for project aliases, workspace config, per-project status, and history filtering.
- 2026-05-14: Adjusted pairing-code refresh so it is allowed from the computer's localhost page even while LAN mode is enabled, while LAN/mobile clients still cannot reveal or rotate the pairing code.
- 2026-05-14: Synchronized `README.en.md` with the Chinese README structure by adding the screenshot preview section, lowest-friction Codex startup tip, and multi-project workspace roadmap items.
- 2026-05-14: Added a WeChat article bonus section inviting readers to follow and reply `Codex` for a Codex advanced resource pack.
