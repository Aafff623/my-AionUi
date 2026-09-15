# CONTEXT.md — Fork 项目上下文

本文件是 fork 治理资产：沉淀本仓库的已验证领域事实、硬约束与词汇。上游通用规范见 [AGENTS.md](AGENTS.md)（勿改上游文件，fork 决策见 [docs/adr/0001](docs/adr/0001-fork-governance-baseline.md)）。

## 溯源

- 本仓库是 `iOfficeAI/AionUi` 的个人 fork（二创基线 `6744099b`，v2.2.2，aioncore v0.2.2），Apache-2.0（无 NOTICE 文件）。
- 远端：`origin` = 本 fork（唯一 push 目标）；`upstream` = `iOfficeAI/AionUi`（同步源）。
- 本地克隆为 `--filter=blob:none` 部分克隆：历史/树全量，文件内容懒加载，访问久远历史需联网补拉。

## 核心架构事实（已验证）

- **AionUi v2.x 是瘦客户端**：独立 Rust 后端 **aioncore**（仓库 `iOfficeAI/AionCore`）承担会话、agent 执行、IM channel、主持久化；本仓库通过 REST + WS 访问 `127.0.0.1:13400`（默认端口）。改业务逻辑前先判断它在客户端还是在 aioncore。
- **Bun workspaces**（`packages/*`）：`desktop`（Electron 主体）、`web-host`（无 Electron 宿主 + 反代）、`web-cli`（`aionui-web` CLI）、`shared-scripts`；`mobile/` 是独立 Expo 应用，不在 workspaces。
- **双进程红线**（上游 AGENTS.md 规定）：main（`packages/desktop/src/process/`）禁 DOM API；renderer（`packages/desktop/src/renderer/`）禁 Node API；跨进程只走 preload IPC bridge。**业务主链路实际是 renderer → HTTP/WS → aioncore**（`common/adapter/ipcBridge.ts` + `httpBridge.ts`），Electron 原生能力（窗口/托盘/更新/对话框）才走 IPC。
- **aioncore 二进制解析顺序**（`process/backend/binaryResolver.ts`）：`AIONUI_BACKEND_BIN` 环境变量 → `resources/bundled-aioncore/<platform>-<arch>/` → 系统 PATH。
- **Agent 类型**（`common/types/agent/detectedAgent.ts`）：`acp | remote | aionrs | openclaw-gateway | nanobot`；本仓库只做检测/配置/UI，执行在 aioncore。
- **better-sqlite3 是 Electron 侧遗留库**（users/conversations/messages/teams/mailbox/team_tasks，`process/services/database/`），与 aioncore 有列级 handoff 契约（`legacyHandoffContract.ts`），动 schema 前先读该契约。
- **i18n 强制**：i18next，13 语言，参考语言 en-US；改用户可见文案必须走 key，类型由 `npm run i18n:types` 生成。

## 硬约束

1. **fork 出包前必须处理更新通道**：`packages/desktop/electron-builder.yml` 的 publish 指向 `iOfficeAI/AionUi` 且 `publishAutoUpdate: true`；CDN 备选 `https://static.aionui.com/releases`（`process/services/updateFeed.ts`）。不改编译产物会向上游检查更新。
2. **版本单一来源是根 `package.json`**；`packages/desktop/package.json` 的 `0.0.0` 是故意的，永不修改。升级 aioncore 走 `.claude/skills/bump-version` 流程。
3. **aioncore 开发依赖 Rust 工具链**：`iOfficeAI/AionCore` 并排 clone + `cargo install --path crates/aionui-app --locked`；开发期不会自动下载后端二进制。
4. 工具链：Node `>=22 <25` + bun（bun.lock 唯一锁文件）；原生模块（better-sqlite3/node-pty/bcrypt）需 electron rebuild（`bun install` 的 postinstall 会处理）。
5. `IS_DISCONTINUED_BUILD` 构建旗标保持 false（上游 `-final` tag 专用）。

## 常用命令

```bash
bun install            # 安装 + 原生模块重建
bun run dev            # 开发（electron-vite）
bun run test           # Vitest 4（覆盖率目标 ≥80%）
bun run lint           # oxlint
bun run webui          # 无 Electron WebUI 模式（dev 端口 25809）
just preflight         # 环境体检
just push              # 提交前全链路：lint-strict → fmt → typecheck → i18n-check → test → push
```

## 词汇表

| 术语 | 含义 |
|---|---|
| aioncore | 独立 Rust 后端（`iOfficeAI/AionCore`），版本由根 package.json `aioncoreVersion` 钉住 |
| aionrs | 内置 agent 引擎类型之一（运行于 aioncore） |
| ACP | Agent Client Protocol，接入外部 CLI agent 的协议（SDK 在根依赖，协议处理在 aioncore） |
| MCP | Model Context Protocol；本仓库含内置 browser/imageGen MCP server（`process/resources/builtinMcp/`） |
| channel | IM 接入（Telegram/DingTalk/Lark/WeCom…），运行时在 aioncore，本仓库只有设置 UI |
| assistant | 配置层预设（绑定 skills/prompts/engine），区别于 agent 本体 |
| team | 多 agent 协作模式，事件经 WS 来自 aioncore |
| extension | 扩展清单 `aion-extension.json`（可贡献 acpAdapters/channels/agents/assistants） |
| hub | AionHub 扩展资源（构建期从 `iOfficeAI/AionHub` 下载，gitignored） |
| pet | 桌宠（独立 MPA 页面 + 专属 preload） |

## 治理边界（fork 特有）

- **只增不改**：不修改上游维护的 `AGENTS.md`、`CLAUDE.md`、`readme.md`、`.gitignore`、`.claude/`，避免 upstream 同步冲突；fork 内容进 `CONTEXT.md` 与 `docs/adr/`。
- `temp/`（本报告与本地脚本，上游已忽略）、`.codegraph/`（代码索引，`.git/info/exclude` 本地忽略）不提交。
- commit 遵循 Conventional Commits，**不加 AI 签名**（上游 AGENTS.md 规定）。

## 存疑/未验证

- ACP 会话与 channel 运行时的实现细节在 aioncore 侧，本仓库不可见。
- `patch-package` 在 devDependencies 但未发现调用点。
- `docs/contributing/development.md` 的 Standalone Server 脚本表已过时（现为 `webui`/`webui:prod`）。
- 完整分析存档：`temp/analysis/aionui-deep-analysis.md`（本地）。
