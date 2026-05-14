# Codex CLI Remote Control

把手机变成本机 Codex CLI 的安全控制面板。

这个项目解决一个很具体的问题：Codex CLI 很适合在电脑上处理代码任务，但人不可能一直坐在电脑前。`codex-cli-remote-control` 提供一个本地优先的 Web 控制台，让你可以在手机浏览器里提交任务、查看流式输出、停止执行、回看历史记录，而真正的 Codex 进程仍然只运行在你的电脑上。

> 当前项目是 MVP，重点是跑通安全边界和核心闭环：手机负责控制，本机负责执行，日志留在本机。

![Codex 手机控制面板](docs/vibe%20coding%20codex%20mobile.jpg)

## 适合谁

- 经常用 Codex CLI 处理代码任务，希望在手机上查看进度的人
- 想把家里或办公室电脑作为本地 AI 工作站的人
- 需要一个简单、可审计、不开公网的远程控制面板的人
- 关注本地优先、人机协作和个人工作系统的人

## 当前能力

- 手机优先的浏览器控制台
- 本机控制台 6 位配对码认证
- 从浏览器提交 Codex 任务
- 本机受控启动 `codex exec`
- 通过 SSE 实时查看 Codex 输出
- 在手机上停止当前任务
- 本地追加写入审计日志和输出日志
- 服务重启后恢复最近任务历史
- 支持回放历史任务输出
- 支持 localhost 模式和可信 LAN 模式

## 安全边界

这个项目的核心边界很明确：手机只拿到一个很窄的控制通道，电脑权限仍然留在本机。

- 手机不能选择任意可执行文件
- 手机不能传入 shell 命令
- 手机不能读取本机文件系统
- 手机不能设置进程环境变量
- 工作目录必须在 `REMOTE_CONTROL_WORKSPACES` 白名单内
- 默认只监听 `127.0.0.1`
- LAN 模式必须显式开启
- Bearer token 只保存在浏览器内存中，不放进 URL
- 输出会做浏览器渲染前的基础清洗和敏感信息脱敏

默认 Codex 执行形态：

```bash
codex exec --skip-git-repo-check --sandbox read-only -C <allowed-workspace> --json -
```

用户输入通过 stdin 传入 Codex，不拼接进 shell 字符串。

## 快速开始

```bash
npm install
npm run build
npm run start
```

启动后打开终端打印的本地地址，在页面中输入终端里的 6 位配对码。

默认地址通常是：

```text
http://127.0.0.1:4317
```

## 手机 LAN 模式

只建议在可信的私人 Wi-Fi 下使用。

```bash
npm run build
npm run start:lan
```

服务会监听 `0.0.0.0`，并打印类似下面的局域网地址：

```text
LAN URL: http://192.168.1.23:4317
```

用同一 Wi-Fi 下的手机打开该地址，再输入电脑终端显示的配对码。

LAN 模式下，网页不会显示或刷新配对码，配对码必须从电脑终端读取。

## 配置

| 环境变量 | 默认值 | 说明 |
| --- | --- | --- |
| `REMOTE_CONTROL_HOST` | `127.0.0.1` | 服务监听地址 |
| `REMOTE_CONTROL_PORT` | `4317` | 服务端口 |
| `REMOTE_CONTROL_ALLOW_LAN` | `false` | 是否允许非 localhost 绑定 |
| `REMOTE_CONTROL_WORKSPACES` | 当前目录 | 允许 Codex 进入的工作目录，多个目录用逗号分隔 |
| `REMOTE_CONTROL_CODEX_BIN` | `codex` | Codex CLI 可执行文件 |
| `REMOTE_CONTROL_CODEX_EXTRA_ARGS` | 空 | 追加给 Codex 的额外参数，逗号分隔 |
| `REMOTE_CONTROL_PROMPT_MAX_LENGTH` | `8000` | 单次任务最大输入长度 |
| `REMOTE_CONTROL_DATA_DIR` | `data` | 本地日志目录 |

## 验证

```bash
npm run lint
npm test
```

使用 mock runner 做本地 smoke：

```bash
REMOTE_CONTROL_PORT=4321 \
REMOTE_CONTROL_CODEX_BIN=/path/to/remote-control/scripts/mock-codex.mjs \
npm run start
```

另开一个终端：

```bash
SMOKE_BASE_URL=http://127.0.0.1:4321 \
npm run smoke:local
```

使用真实 Codex CLI 做 smoke：

```bash
REMOTE_CONTROL_PORT=4322 npm run start
```

另开一个终端：

```bash
SMOKE_BASE_URL=http://127.0.0.1:4322 \
npm run smoke:codex
```

LAN smoke：

```bash
npm run start:lan
```

另开一个终端，填入电脑终端打印的配对码：

```bash
SMOKE_BASE_URL=http://127.0.0.1:4317 \
PAIRING_CODE=<printed-code> \
npm run smoke:lan
```

## 后续计划

- 多工作区体验优化：更清楚地展示当前工作区、最近使用工作区和任务来源
- 更强的任务模板：沉淀常用 Codex 任务，例如 review、修 bug、写测试、整理文档
- 更完整的历史检索：按状态、时间、工作区、关键词搜索历史任务
- 更细的权限边界：按工作区配置不同的 Codex 参数和执行策略
- 更好的移动端体验：输出折叠、任务通知、断线重连和长任务状态提示
- 安全远程访问：支持人在外面用移动网络连接家里或公司电脑上的 Codex，但默认通过受控隧道、设备授权和短期会话实现，不直接裸露公网端口
- 可选 SQLite 存储：当历史查询能力变复杂后，替换当前 JSONL 轻量存储
- 可选桌面托盘入口：降低启动成本，让本机服务更像一个常驻工具
- 更完整的安全文档：补充威胁模型、局域网使用建议和公网暴露风险说明

## 为什么开源

AI 编程工具越来越强，真正有价值的是把 AI 放进自己的工作系统里，同时保留人的判断权。

这个项目希望提供一个很小但可复用的起点：电脑保留执行权，手机提供控制面板，人保留判断权。它可以是一个远程控制工具，也可以是个人 AI 工作站的一个组件。

如果你也在探索本地优先的 AI 工作流、Codex CLI、个人工作台或 Human3.0 方向，欢迎 Star、Watch，或者关注后续迭代。

## 贡献

欢迎提交 Issue 和 PR。更希望收到这些反馈：

- 真实使用场景
- 安全边界建议
- 移动端交互问题
- Codex CLI 任务模板
- 本地工作流集成方式

## License

开源协议待补充。正式发布前建议选择 MIT、Apache-2.0 或其他适合你目标的协议。
