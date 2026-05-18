# 移动网络远程访问 / Mobile Data Remote Access

本文档说明如何用手机移动网络连接家里 Wi-Fi 电脑上的 Codex。

核心边界不变：

- 电脑仍然是执行环境。
- 手机只是浏览器控制面板。
- 不要把这个服务直接做路由器端口转发暴露到公网。
- 长期使用应优先选择 Tailscale 私有网络，或 Cloudflare Tunnel + Access。
- Cloudflare quick tunnel 只适合短时间手动演示。

## 推荐方案

按安全性和长期可维护性排序：

1. **Tailscale / 私有设备网络**：手机和电脑都加入同一个私有网络，适合长期个人使用。
2. **Cloudflare Tunnel + Access**：用 Cloudflare Access 先保护入口，再转发到本机服务。
3. **Cloudflare quick tunnel**：无需账号即可生成临时 URL，只适合短时间验证，不适合常驻。

## 方案 A：Cloudflare Quick Tunnel 一键试用

这是小范围试用的推荐入口。它会启动本地服务、创建 quick tunnel、打印手机访问地址和配对码，并在超时后自动关闭。

在项目根目录执行：

```bash
npm run remote:quick
```

默认行为：

- 构建项目。
- 启动服务在 `127.0.0.1:4317`。
- 创建 Cloudflare quick tunnel。
- 打印手机访问 URL。
- 使用 12 位配对码。
- 配对码有效期为 15 分钟。
- 手机 session token 有效期与 tunnel 超时时间一致。
- 对错误配对尝试做限速。
- 默认 24 小时后自动关闭本地服务和 tunnel。

终端会打印类似内容：

```text
Phone URL:
  https://example-words.trycloudflare.com

Pairing code:
  123456789012

Auto-stop:
  24h (...)
```

保持这个终端不要关闭。

如果要缩短试用时间：

```bash
npm run remote:quick -- --ttl 30m
npm run remote:quick -- --ttl 2h
```

当前脚本不允许超过 24 小时，避免用户忘记关闭临时公网入口。

如果本机还没有 `cloudflared`，先按 Cloudflare 官方文档安装。

### 手动两终端方式

如果你不想用一键脚本，也可以手动启动。

终端 1：

```bash
npm run dev:remote
```

终端 2：

```bash
cloudflared tunnel --url http://127.0.0.1:4317
```

关闭任一终端后，对应服务或临时 URL 就不可用了。

### 3. 手机上测试

1. 关闭手机 Wi-Fi，确认使用移动网络。
2. 打开上一步打印的 `https://...trycloudflare.com` 地址。
3. 输入电脑终端 1 打印的 12 位配对码。
4. 选择工作目录。
5. 提交一个简单任务，例如：

```text
回复 REMOTE_CONTROL_OK
```

手机端默认只展示用户关心的回答、错误和必要状态。需要排查时，可以打开「详细日志」。

### 4. 配对码过期怎么办

一键脚本默认配对码 15 分钟过期。过期后，停止脚本并重新运行 `npm run remote:quick` 获取新地址和新配对码。

手动方式下，如果你只是做一次较慢的测试，可以直接用更长的临时配对有效期启动：

```bash
npm run build
REMOTE_CONTROL_PAIRING_CODE_LENGTH=12 REMOTE_CONTROL_PAIRING_TTL_SECONDS=900 REMOTE_CONTROL_TOKEN_TTL_SECONDS=1800 node dist/index.js
```

这会把配对码有效期改为 15 分钟。

### 5. 结束测试

使用一键脚本时：

- 到达 TTL 会自动关闭。
- 按 `Ctrl+C` 会立即关闭本地服务和 tunnel。

使用手动方式时，关闭两个终端里的进程：

- `npm run dev:remote`
- `cloudflared tunnel --url ...`

不要让 quick tunnel 长时间保持开启。

## 方案 B：Tailscale / 私有网络

如果手机和电脑都在同一个 Tailscale 或私有 VPN 网络里，可以启动 LAN 模式：

```bash
npm run dev:lan
```

然后用手机打开电脑在私有网络里的 IP 和端口。这个方式更适合长期使用，因为入口不需要公开到公网。

## 验证清单

完成一次真实验证时，至少确认：

- 手机 Wi-Fi 已关闭，浏览器走移动网络。
- 手机能打开远程 URL。
- 配对码来自电脑终端。
- 手机能创建 Codex 任务。
- Codex 实际运行在电脑上。
- 输出能流式回到手机。
- 运行日志仍保存在电脑本地 `data/` 目录。
- 远程访问下 `/api/health` 中 `localPairingCodeAvailable` 应为 `false`。

自动化验证可使用：

```bash
SMOKE_BASE_URL=https://example.trycloudflare.com PAIRING_CODE=123456789012 npm run smoke:codex
```

把 URL 和配对码替换成真实值。

---

# English

This document explains how to reach Codex running on a home Wi-Fi computer from a phone on mobile data.

The core boundary stays the same:

- The computer remains the execution environment.
- The phone is only a browser control panel.
- Do not port-forward this service from your home router to the public internet.
- For regular use, prefer Tailscale/private networking or Cloudflare Tunnel with Access.
- Cloudflare quick tunnel is suitable only for a short manual demo.

## Recommended Options

1. **Tailscale / private device network**: best for long-term personal use.
2. **Cloudflare Tunnel + Access**: use Cloudflare Access before forwarding to this local service.
3. **Cloudflare quick tunnel**: easiest for a short demo, not for always-on use.

## Option A: One-Command Cloudflare Quick Tunnel Demo

This is the recommended entry point for small-scale trials. It starts the local service, creates a quick tunnel, prints the phone URL and pairing code, and auto-stops after the timeout.

Run from the project root:

```bash
npm run remote:quick
```

Defaults:

- Build the project.
- Start the service on `127.0.0.1:4317`.
- Create a Cloudflare quick tunnel.
- Print the phone URL.
- Use a 12-digit pairing code.
- Keep the pairing code valid for 15 minutes.
- Keep the phone session token valid for the tunnel timeout.
- Rate-limit invalid pairing attempts.
- Auto-stop both the local service and tunnel after 24 hours.

Example output:

```text
Phone URL:
  https://example-words.trycloudflare.com

Pairing code:
  123456789012

Auto-stop:
  24h (...)
```

Keep this terminal open.

To shorten the trial:

```bash
npm run remote:quick -- --ttl 30m
npm run remote:quick -- --ttl 2h
```

The script does not allow more than 24 hours.

Install `cloudflared` first if it is not already available.

### Manual two-terminal fallback

Terminal 1:

```bash
npm run dev:remote
```

Terminal 2:

```bash
cloudflared tunnel --url http://127.0.0.1:4317
```

Closing either terminal stops the related local service or temporary URL.

### 3. Test from the phone

1. Turn off phone Wi-Fi so the browser uses mobile data.
2. Open the printed `https://...trycloudflare.com` URL.
3. Enter the 12-digit pairing code from terminal 1.
4. Select a workspace.
5. Submit a simple task, for example:

```text
Reply with exactly REMOTE_CONTROL_OK.
```

The phone UI shows user-facing answers, errors, and necessary status by default. Enable detailed logs only when debugging.

### 4. If the pairing code expires

The one-command script keeps the pairing code valid for 15 minutes. If it expires, stop the script and run `npm run remote:quick` again to get a new URL and pairing code.

For a slower manual test in fallback mode, start with a longer temporary pairing lifetime:

```bash
npm run build
REMOTE_CONTROL_PAIRING_CODE_LENGTH=12 REMOTE_CONTROL_PAIRING_TTL_SECONDS=900 REMOTE_CONTROL_TOKEN_TTL_SECONDS=1800 node dist/index.js
```

This makes the pairing code valid for 15 minutes.

### 5. End the test

With the one-command script:

- It auto-stops when TTL expires.
- Press `Ctrl+C` to stop immediately.

With manual mode, stop both terminals:

- `npm run dev:remote`
- `cloudflared tunnel --url ...`

Do not keep a quick tunnel open for long periods.

## Option B: Tailscale / Private Network

If the phone and computer are on the same Tailscale or private VPN network, start LAN mode:

```bash
npm run dev:lan
```

Open the computer's private-network IP and port from the phone. This is better for regular use because the endpoint is not public.

## Verification Checklist

- Phone Wi-Fi is off and the browser uses mobile data.
- The remote URL loads from the phone.
- Pairing uses the current code printed in the computer terminal.
- The phone can create a Codex task.
- Codex actually runs on the computer.
- Output streams back to the phone.
- Logs remain in the computer's local `data/` directory.
- `/api/health` returns `localPairingCodeAvailable=false` through remote access.

Automated verification:

```bash
SMOKE_BASE_URL=https://example.trycloudflare.com PAIRING_CODE=123456789012 npm run smoke:codex
```

Use the real URL and current pairing code.
