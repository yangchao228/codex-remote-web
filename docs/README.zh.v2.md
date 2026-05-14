# Codex CLI Remote Control

一个本地优先的 Codex CLI 手机遥控器。

`codex-cli-remote-control` 是一个 Node.js + TypeScript 写的轻量服务。它在电脑上启动一个 Web 控制面板，手机通过浏览器访问这个面板，完成配对、提交任务、查看输出、停止任务和回看历史。

项目的设计目标很克制：不做远程 shell，不做公网控制，不把本机文件系统暴露给手机。手机只是一个经过认证的控制端，Codex CLI 始终在电脑本机执行。

## 功能概览

| 能力 | 状态 | 说明 |
| --- | --- | --- |
| 移动端 Web UI | 已支持 | 手机浏览器直接访问，无需安装 App |
| 本机配对码 | 已支持 | 通过电脑终端显示的一次性配对码换取短期 token |
| 创建 Codex 任务 | 已支持 | 浏览器提交 prompt，本机启动受控 `codex exec` |
| 实时输出 | 已支持 | SSE 流式返回 stdout / stderr / 状态事件 |
| 停止任务 | 已支持 | 手机端可终止当前 Codex 进程组 |
| 审计日志 | 已支持 | session 元数据和输出事件追加写入本地 JSONL |
| 历史恢复 | 已支持 | 服务启动后恢复最近任务记录 |
| 历史回放 | 已支持 | 点击最近任务可回放本地输出日志 |
| LAN 模式 | 已支持 | 显式开启后可在同一 Wi-Fi 下用手机访问 |

## 架构

```text
Phone Browser
  |
  | HTTP + Bearer Token + SSE
  v
Local Node.js Service
  |
  | child_process.spawn(file, args, { shell: false })
  v
Codex CLI on Laptop
  |
  v
Local JSONL Logs
```

核心边界：

- Browser 只调用固定 API
- Server 负责认证、工作区校验、进程控制和日志
- Codex CLI 只在本机运行
- Logs 只写入本机 `data/` 目录

## API 能力

当前服务暴露的主要接口：

- `GET /`：移动端控制台
- `GET /api/health`：服务状态、LAN 状态、工作区白名单
- `POST /api/local-pairing-code`：localhost 模式下刷新配对码
- `POST /api/pair`：使用配对码换取 token
- `POST /api/revoke`：撤销当前 token
- `GET /api/tasks`：查看任务列表
- `GET /api/tasks/:id`：查看任务详情和历史输出
- `POST /api/tasks`：创建 Codex 任务
- `POST /api/tasks/:id/stop`：停止任务
- `GET /api/tasks/:id/stream`：订阅任务 SSE 输出

## 安全设计

这个项目默认把手机输入当成不可信输入处理。

- 不使用 `shell: true`
- 不把用户输入拼接到 shell 字符串
- 不允许浏览器选择可执行文件
- 不允许浏览器传环境变量
- 不允许浏览器直接访问文件系统
- 所有工作区都经过 allowlist 和 realpath 校验
- 单次 prompt 有长度上限
- MVP 阶段只允许一个活跃 Codex 进程
- token 不进入 URL
- 默认监听 `127.0.0.1`
- LAN 监听必须设置 `REMOTE_CONTROL_ALLOW_LAN=true`
- 本地输出日志和审计日志默认进入 `data/`

默认 Codex 命令：

```bash
codex exec --skip-git-repo-check --sandbox read-only -C <allowed-workspace> --json -
```

## 安装与启动

```bash
npm install
npm run build
npm run start
```

启动后，根据终端输出打开本地地址，并输入终端显示的配对码。

## 局域网访问

```bash
npm run build
npm run start:lan
```

打开终端打印的 LAN URL，例如：

```text
http://192.168.1.23:4317
```

LAN 模式适合可信内网。不要把服务直接暴露到公网。

## 环境变量

```bash
REMOTE_CONTROL_HOST=127.0.0.1
REMOTE_CONTROL_PORT=4317
REMOTE_CONTROL_ALLOW_LAN=false
REMOTE_CONTROL_WORKSPACES=/path/to/repo-a,/path/to/repo-b
REMOTE_CONTROL_CODEX_BIN=codex
REMOTE_CONTROL_CODEX_EXTRA_ARGS=
REMOTE_CONTROL_PROMPT_MAX_LENGTH=8000
REMOTE_CONTROL_DATA_DIR=data
```

## 开发命令

```bash
npm run build      # TypeScript 编译
npm run lint       # 类型检查
npm test           # 单元测试
npm run start      # localhost 模式
npm run start:lan  # LAN 模式
```

Smoke 测试：

```bash
npm run smoke:local
npm run smoke:codex
npm run smoke:lan
```

`smoke:codex` 会通过本地服务创建一个真实 Codex CLI 任务，验证流式输出、完成状态和本地日志路径。

## 项目结构

```text
src/
  auth.ts             # 配对码、token、撤销
  config.ts           # 环境变量配置
  http.ts             # HTTP API 和 SSE
  runner.ts           # Codex CLI 进程启动与停止
  session-manager.ts  # 任务状态、订阅、恢复
  audit.ts            # 本地 JSONL 审计和输出日志
  workspace.ts        # 工作区 allowlist 校验
  static-page.ts      # 移动端控制台页面
scripts/
  smoke-local.mjs
  smoke-codex.mjs
  mock-codex.mjs
docs/
  *.jpg
```

## Roadmap

近期优先级：

- 任务模板系统：把常见 Codex 使用方式沉淀成一键任务
- 更好的任务历史：筛选、搜索、收藏和失败原因聚合
- 移动端输出优化：更稳定的长输出阅读、折叠和错误聚焦
- 工作区配置文件：为不同 repo 配置不同默认参数
- 更完整的安全测试：覆盖更多输入边界和局域网误用场景
- 安全远程访问方案：让手机在移动网络下连接家里或公司电脑上的 Codex，优先评估 Tailscale / WireGuard / Cloudflare Tunnel / 自托管 relay 等方案，并保留设备授权、短期 token 和审计日志

中期方向：

- SQLite 存储后端
- 桌面托盘启动器
- Web Push 或本地通知
- 多任务队列
- 插件化 runner，不只支持 Codex CLI
- 可分享的任务模板库
- 远程连接状态页：展示当前连接来源、设备、会话、风险提示和一键断开能力

暂不默认支持：

- 公网隧道
- 任意 shell 执行
- 手机文件管理器
- 长期保存浏览器 token
- 自动绕过 Codex / workspace 安全限制

## Star 这个项目

如果你也希望把 Codex CLI 变成一个更可用的个人工作台，欢迎 Star 和 Watch。

后续我会持续记录这个项目从 MVP 到可长期使用工具的过程，包括安全边界、移动端体验、任务模板、个人 AI 工作流和本地优先架构。

## License

开源协议待补充。
