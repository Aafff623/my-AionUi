# CONTEXT.md — Fork 项目上下文

本文件是 fork 治理资产：沉淀本仓库的已验证领域事实、硬约束与词汇。上游通用规范见 [AGENTS.md](AGENTS.md)（勿改上游文件，fork 决策见 [docs/adr/0001](docs/adr/0001-fork-governance-baseline.md)）。

## 溯源

- 本仓库是 `iOfficeAI/AionUi` 的个人 fork（二创基线 `6744099b`，v2.2.2，aioncore v0.2.2），Apache-2.0（无 NOTICE 文件）。
- 远端：`origin` = 本 fork（唯一 push 目标）；`upstream` = `iOfficeAI/AionUi`（同步源）。
- 本地克隆为 `--filter=blob:none` 部分克隆：历史/树全量，文件内容懒加载，访问久远历史需联网补拉。
- **品牌已替换为 threetwoa**（ADR-0003）：产品名/appId `com.threetwoa.app`/深链 `threetwoa://`/数据目录 `~/.threetwoa*`；上游版权头、`AIONUI_*` 环境变量、`@aionui/*` scope、aioncore/aionrs 组件名按许可证与功能性保留。

## 核心架构事实（已验证）

- **AionUi v2.x 是瘦客户端**：独立 Rust 后端 **aioncore**（仓库 `iOfficeAI/AionCore`）承担会话、agent 执行、IM channel、主持久化；本仓库通过 REST + WS 访问 `127.0.0.1:13400`（默认端口）。改业务逻辑前先判断它在客户端还是在 aioncore。
- **Bun workspaces**（`packages/*`）：`desktop`（Electron 主体）、`web-host`（无 Electron 宿主 + 反代）、`web-cli`（`aionui-web` CLI）、`shared-scripts`；`mobile/` 是独立 Expo 应用，不在 workspaces。
- **双进程红线**（上游 AGENTS.md 规定）：main（`packages/desktop/src/process/`）禁 DOM API；renderer（`packages/desktop/src/renderer/`）禁 Node API；跨进程只走 preload IPC bridge。**业务主链路实际是 renderer → HTTP/WS → aioncore**（`common/adapter/ipcBridge.ts` + `httpBridge.ts`），Electron 原生能力（窗口/托盘/更新/对话框）才走 IPC。
- **aioncore 二进制解析顺序**（`process/backend/binaryResolver.ts`）：`AIONUI_BACKEND_BIN` 环境变量 → `resources/bundled-aioncore/<platform>-<arch>/` → 系统 PATH。
- **Agent 类型**（`common/types/agent/detectedAgent.ts`）：`acp | remote | aionrs | openclaw-gateway | nanobot`；本仓库只做检测/配置/UI，执行在 aioncore。
- **better-sqlite3 是 Electron 侧遗留库**（users/conversations/messages/teams/mailbox/team_tasks，`process/services/database/`），与 aioncore 有列级 handoff 契约（`legacyHandoffContract.ts`），动 schema 前先读该契约。
- **i18n 强制**：i18next，13 语言，参考语言 en-US；改用户可见文案必须走 key，类型由 `npm run i18n:types` 生成。

## 硬约束

1. **更新通道已指向 fork**（ADR-0003 已执行）：electron-builder publish = `Aafff623/my-AionUi`；运行时 feed 走 electron-updater GitHub provider（`process/services/updateFeed.ts`），上游 CDN `static.aionui.com` 已移除——**不得改回上游，否则 fork 安装包会被上游更新覆盖**。
2. **版本单一来源是根 `package.json`**；`packages/desktop/package.json` 的 `0.0.0` 是故意的，永不修改。升级 aioncore 走 `.claude/skills/bump-version` 流程。
3. **aioncore 开发依赖 Rust 工具链**：`iOfficeAI/AionCore` 并排 clone + `cargo install --path crates/aionui-app --locked`；开发期不会自动下载后端二进制。
4. 工具链：Node `>=22 <25` + bun（bun.lock 唯一锁文件）；原生模块（better-sqlite3/node-pty/bcrypt）需 electron rebuild（`bun install` 的 postinstall 会处理）。
5. `IS_DISCONTINUED_BUILD` 构建旗标保持 false（上游 `-final` tag 专用）。
6. **rebrand 常态冲突**：同步 upstream 时，品牌面文件（electron-builder.yml、deepLink.ts、数据目录、i18n 品牌词、图标、CI 产物名）会冲突，按 ADR-0003 的替换/保留边界逐项吸收，不许整块还原上游品牌。

## CI 与出包（fork 实测路径）

- ⚠️ **push / tag 推送不触发任何 workflow**（2026-09-16 实测：推 tag 后零 run；Actions 页无 fork 禁用横幅、workflow 均 active、`gh workflow enable` 无效）——**出包目前只能走 `build-manual.yml` 手动派发**（workflow_dispatch 正常）。tag 自动发布链待排查（怀疑与本机推送凭据/事件投递有关）。
- **已验证的出包路径（Windows）**：`build-manual.yml`（`include_update_metadata=true`）→ 下载 artifacts → `gh release create` 手工挂载。首个产物版本 **v2.2.2-threetwoa.2**：`threetwoa-2.2.2-win-x64.exe`（未签名）+ `latest.yml`；更新通道 URL（`releases/latest/download/latest.yml`）实测 **200，闭环**；质量门在该 run 中 CI 全绿（含 tsc/vitest，ubuntu）。
- **发布与命名**：tag / 标题用 `vX.Y.Z-threetwoa.N`（上游版本 + 品牌 + 同基线序号，见 ADR-0004；首批 `-fork.N` 已于 2026-09-16 改名）；release 正文按热门项目惯例组织：下载表 → 亮点 → 修复与改进 → 基线 → Full Changelog（中文，标题中英对照）。
- **上游设计的自动链**（`build-and-release.yml`，tag 触发）：仓库变量 `PUBLISH_RELEASE=true` 已设置；因触发问题未走通。恢复后六平台构建 + release job（softprops）自动创建 release。
- **构建脚本永远 `--publish=never`**（`scripts/build-with-builder.js:785`）：electron-builder 不会隐式发布；产物要么走 `build-and-release` 的 release job，要么手工 `gh release create`。
- **secrets 依赖**：仓库当前无任何 secrets；linux-x64 有 Sentry 守卫（无 token 自动跳过，不再硬失败）；macOS 无证书降级 unsigned；零 secrets 下 Windows 已验证可出包。
- 版本规则见 ADR-0004：**已分发版本 = 2.2.2**（首个安装包），下一次含产物的发布需 bump 普通版本（如 2.2.3）。

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

> 本机 node_modules 曾处于残缺状态（`.bin` 为空、`@icon-park/react` 等 16 个包装配失败），表现为 `bun run` 系列 command not found、`tsc` 报数百个"找不到模块"。2026-09-16 以 `bun install --frozen-lockfile` 修复（未动 bun.lock）：`.bin` 链接恢复、`tsc --noEmit` **0 错**。遇到同类症状先重跑安装，不要当成代码问题。
>
> 全量 `bun run test` 本机实测（修复后两次）：约 4974/4985 过，挂点两类——① `tests/unit/common/imageGenCore.test.ts` 3 个 symlink 用例（Windows 无权限，必然挂）；② 1~3 个全量并行负载下的偶发（`tests/unit/previews/*.dom.test.tsx` 模块加载、`tests/unit/releasePackagingConfig.test.ts` 的 bash 用例——隔离复跑全过）。CI（ubuntu）预期全绿，symlink 与偶发项均不构成发布阻塞。

## 词汇表

| 术语      | 含义                                                                                                |
| --------- | --------------------------------------------------------------------------------------------------- |
| aioncore  | 独立 Rust 后端（`iOfficeAI/AionCore`），版本由根 package.json `aioncoreVersion` 钉住                |
| aionrs    | 内置 agent 引擎类型之一（运行于 aioncore）                                                          |
| ACP       | Agent Client Protocol，接入外部 CLI agent 的协议（SDK 在根依赖，协议处理在 aioncore）               |
| MCP       | Model Context Protocol；本仓库含内置 browser/imageGen MCP server（`process/resources/builtinMcp/`） |
| channel   | IM 接入（Telegram/DingTalk/Lark/WeCom…），运行时在 aioncore，本仓库只有设置 UI                      |
| assistant | 配置层预设（绑定 skills/prompts/engine），区别于 agent 本体                                         |
| team      | 多 agent 协作模式，事件经 WS 来自 aioncore                                                          |
| extension | 扩展清单 `aion-extension.json`（可贡献 acpAdapters/channels/agents/assistants）                     |
| hub       | AionHub 扩展资源（构建期从 `iOfficeAI/AionHub` 下载，gitignored）                                   |
| pet       | 桌宠（独立 MPA 页面 + 专属 preload）                                                                |

## 治理边界（fork 特有）

- **只增不改**：不修改上游维护的 `AGENTS.md`、`CLAUDE.md`、`readme.md`、`.gitignore`、`.claude/`，避免 upstream 同步冲突；fork 内容进 `CONTEXT.md` 与 `docs/adr/`。
- `temp/`（本报告与本地脚本，上游已忽略）、`.codegraph/`（代码索引，`.git/info/exclude` 本地忽略）不提交。
- commit 遵循 Conventional Commits，**不加 AI 签名**（上游 AGENTS.md 规定）。

## 存疑/未验证

- ACP 会话与 channel 运行时的实现细节在 aioncore 侧，本仓库不可见。
- `patch-package` 在 devDependencies 但未发现调用点。
- `docs/contributing/development.md` 的 Standalone Server 脚本表已过时（现为 `webui`/`webui:prod`）。
- 完整分析存档：`temp/analysis/aionui-deep-analysis.md`（本地）。
