# Codex CLI Remote Control

我想要的是一个更安全的本机 AI 工作台，手机只承担控制面板的角色。

Codex CLI 已经可以在电脑上帮我们读代码、改代码、跑测试。但真实使用时有一个很小的痛点：很多任务开始之后，人其实可以离开电脑，可是你仍然需要知道它有没有跑完、输出了什么、要不要停掉。

`codex-cli-remote-control` 就是为这个场景做的：手机只是控制面板，电脑仍然是执行环境，Codex CLI 仍然在本机运行。

![手机上的 Codex 控制面板](docs/vibe%20coding%20codex%20mobile.jpg)

## 一句话说明

用手机浏览器控制电脑上的 Codex CLI：提交任务、看实时输出、停止执行、回看历史，但不把电脑变成一个暴露在网络上的 shell。

## 这个项目坚持的边界

手机不应该拥有电脑的完整控制权。

所以这个项目从第一版开始就限制了能力范围：

- 手机不能执行任意 shell 命令
- 手机不能选择任意可执行文件
- 手机不能读取电脑文件系统
- 手机不能传入环境变量
- 手机只能选择白名单里的工作目录
- 默认只允许本机访问
- 局域网访问必须显式开启
- 所有任务记录和输出日志都留在电脑本地

这是一个远控工具，但它更像“任务控制台”，不会给手机开放远程 root 权限。

## 已经能做什么

- 打开一个本地 Web 控制台
- 用电脑终端里的 6 位配对码完成手机配对
- 在手机上选择工作目录
- 在手机上输入 Codex 任务
- 在电脑上启动受控的 `codex exec`
- 在手机上实时看输出
- 在手机上一键停止当前任务
- 查看最近任务
- 回放历史任务输出
- 通过 JSONL 在本地保存审计记录
- 在可信 Wi-Fi 下开启 LAN 模式

## 使用方式

先安装依赖并构建：

```bash
npm install
npm run build
```

本机使用：

```bash
npm run start
```

手机局域网使用：

```bash
npm run start:lan
```

启动后看终端输出。localhost 模式打开本地地址，LAN 模式用手机打开终端打印的局域网地址。

页面会要求输入配对码。这个配对码来自电脑终端。

## 配置工作区

默认只允许 Codex 在当前目录执行。你可以通过环境变量配置多个允许目录：

```bash
REMOTE_CONTROL_WORKSPACES=/Users/me/project-a,/Users/me/project-b npm run start
```

默认 Codex 执行命令是：

```bash
codex exec --skip-git-repo-check --sandbox read-only -C <allowed-workspace> --json -
```

如果你需要指定 Codex 可执行文件：

```bash
REMOTE_CONTROL_CODEX_BIN=/path/to/codex npm run start
```

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `npm run build` | 编译 TypeScript |
| `npm run lint` | 类型检查 |
| `npm test` | 跑测试 |
| `npm run start` | 本机模式启动 |
| `npm run start:lan` | 局域网模式启动 |
| `npm run smoke:local` | mock runner smoke 测试 |
| `npm run smoke:codex` | 真实 Codex CLI smoke 测试 |
| `npm run smoke:lan` | LAN 模式 smoke 测试 |

## 为什么不用 SSH 替代

SSH 很强，但它给的是完整机器入口。

这个项目的目标更窄：只把“提交 Codex 任务、查看输出、停止任务”这几个动作开放给手机。大部分时候，我们并不需要在手机上获得一个完整终端，只需要知道 AI 任务进展，并在必要时做判断。

人的判断保留在控制台里，执行能力留在电脑本地。

## 后续计划

我会优先做这些方向：

- 常用任务模板：把“帮我 review 当前分支”“修这个报错”“补测试”“解释这段代码”沉淀成可复用任务
- 任务历史资产化：让每一次 Codex 执行都能沉淀为可搜索、可复盘、可复用的记录
- 更好的手机阅读体验：长输出折叠、重点提取、失败状态更明显
- 多工作区管理：让不同项目有自己的默认参数、安全策略和任务模板
- 本地通知：长任务完成后给手机或桌面发提醒
- 安全远程访问：人在外面时，可以用移动网络连接家里或公司电脑上的 Codex，但连接方式要经过设备授权、短期 token、访问审计和一键断开控制
- 桌面常驻入口：减少每次启动服务的成本
- 更强的安全模型：补充 threat model、权限配置和公网暴露风险提示

更远一点，这个项目可以演化成一个本地 AI 工作站入口：

- 不只控制 Codex CLI
- 支持更多本地 agent runner
- 支持个人工作流模板
- 支持可信设备远程接入
- 支持长期任务记录和复盘
- 形成一套可以自托管的个人 AI 操作台

## 适合关注这个项目的人

- 你正在高频使用 Codex CLI
- 你希望手机只是控制面板，电脑仍然是执行环境
- 你不想把本机 agent 服务直接暴露到公网
- 你在搭建自己的 AI 工作流
- 你关注本地优先、个人系统、AI 工作台和 Human3.0

如果你对这个方向感兴趣，欢迎 Star / Watch。后续我会继续把真实使用中遇到的问题、设计取舍和迭代记录沉淀下来。

## 当前状态

MVP 已经可运行，并已覆盖：

- 类型检查
- 单元测试
- mock runner smoke
- 真实 Codex CLI smoke
- LAN 模式 smoke

项目还在早期阶段，欢迎用 Issue 提真实场景和改进建议。

## License

MIT License. 详见 [../LICENSE](../LICENSE)。
