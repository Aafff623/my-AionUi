# ADR-0003: 品牌替换 AionUi → threetwoa（rebrand 边界）

- **状态**: Accepted
- **日期**: 2026-09-16
- **决策人**: 仓库所有者（Aafff623）
- **关联**: [ADR-0001](0001-fork-governance-baseline.md)、[ADR-0002](0002-readme-redesign-and-cover.md)

## 背景

所有者要求移除原作者（iOfficeAI/AionUi）的全部标识，替换为自有标识 **threetwoa**。全仓清点：1293 个文件含 "AionUi"（约 3900 处）、13 语言 i18n × ~70 处、217 个 `AIONUI_*` 环境变量、1 个 `@aionui/*` workspace scope、更新通道遥测指向上游。直接全量替换会摧毁与 upstream 的可合并性并违反 Apache-2.0，故划定替换边界。

## 决策：替换面（品牌面，全部执行）

| 面                                                   | 旧 → 新                                                                                                                                                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 产品名 / productName / executableName                | AionUi → threetwoa                                                                                                                                                                                      |
| appId / Windows AppUserModelID / updaterCacheDirName | com.aionui.app → com.threetwoa.app                                                                                                                                                                      |
| 深链协议                                             | aionui:// → threetwoa://（deepLink PROTOCOL_SCHEME + builder protocols + Linux MimeType）                                                                                                               |
| 数据目录                                             | ~~/.aionui[-dev]、~~/.aionui-config[-dev]、~~/.aionui-env、~~/.aionui-web[-dev] → ~/.threetwoa\*（与上游安装完全隔离，fresh start）                                                                     |
| i18n 13 语言                                         | 928 处 "AionUi" → "threetwoa"（AionCore 组件名保留）                                                                                                                                                    |
| 更新通道                                             | electron-builder publish → `Aafff623/my-AionUi`；运行时 feed 从上游 CDN（static.aionui.com，**安全隐患**）切到 electron-updater 原生 GitHub provider 指向 fork releases；删除孤立的上游 CDN provider 类 |
| 遥测                                                 | Sentry DSN 仍走 env 注入（默认空=禁用），无上游硬编码端点；analytics id 为本地随机 UUID，保留                                                                                                           |
| PWA                                                  | manifest name/short_name/description + sw.js CACHE_NAME → threetwoa                                                                                                                                     |
| 图标                                                 | app.ico/app.png/app.icns/renderer brand logo → 生成的 "32a" 标（深色圆角方块 + 白色 32a + 绿点）                                                                                                        |
| CI 产物名                                            | workflows 中 productName 派生的 exe/app/artifact 路径 → threetwoa（Linux deb 二进制匹配兼容新旧名）                                                                                                     |
| GitHub 面板                                          | ISSUE_TEMPLATE/PR 模板联系链接 → fork 仓库；homebrew cask 模板 → threetwoa（fork releases URL，sha 占位）                                                                                               |
| 包名                                                 | 根 package.json name/author → threetwoa（noreply 邮箱）                                                                                                                                                 |
| 手动检查更新                                         | updateBridge 从上游 CDN 清单（权威源）切到 fork GitHub release 的 channel yml（`releases/latest/download/latest*.yml`），资产 URL 不再重写 CDN；下载域名白名单移除 static.aionui.com                    |
| web-cli 分发                                         | `aionui-web` → `threetwoa-web`：bin 命令、可执行名、tarball 名、staging 目录、install-web.sh（含上游 release URL → fork）、smoke 脚本、workflow                                                         |
| 出站请求头                                           | OpenAI 兼容客户端 `X-Title: AionUi` / `HTTP-Referer: aionui.com` → `threetwoa` / fork 仓库 URL                                                                                                          |
| 页面标题 / 日志前缀                                  | renderer index.html `<title>`；主进程 48 处 `[AionUi]`/`[AionUi:*]` 日志前缀与 ready 标记                                                                                                               |
| 安装器                                               | 安装器自标识字符串（query-lockers/report-failure/smoke 脚本）→ threetwoa installer；构建脚本进程检测 AionUi.exe → threetwoa.exe；发布脚本工件名 AionUi-→threetwoa-                                      |
| dev 应用名                                           | `AionUi-Dev[-2]` userData 隔离名 → `threetwoa-Dev[-2]`                                                                                                                                                  |
| resetpass 对齐                                       | resetpass.ts 的 WebUI 数据目录逻辑与 webui.ts 对齐（`.threetwoa-web*`）                                                                                                                                 |
| mobile                                               | aionui-mobile → threetwoa-mobile                                                                                                                                                                        |

## 决策：保留面（法定 / 功能性，不替换）

1. **Apache-2.0 版权头**：全部源码的 `Copyright 2025 AionUi (aionui.com)` 头是许可证法定保留项（§4c），**不改**。安装包 copyright 字段采用「上游 © + fork ©」双行保留归属。
2. **LICENSE / CHANGELOG / docs/readme/（9 语言上游产品介绍）**：上游事实历史，保留并在 fork readme 页脚归属。
3. **`AIONUI_*` 环境变量（217 个）**：内部开发 API，零用户可见性；全改破坏脚本/CI/文档且无品牌收益。保留。
4. **`@aionui/*` workspace scope**：内部包名（bun.lock 引用），保留。
5. **aioncore / aionrs / ACP 组件名**：真实二进制与引擎名，功能依赖，保留。
6. **CI 的上游生态门控**（codecov 的 `github.repository == 'iOfficeAI/AionUi'` 判断、issue-triage Kimi 活动模板）：在 fork 上按条件自然不触发，逻辑无害，保留。
7. **resources/ 上游营销图**（banner/logo/header PNG、演示 GIF）：已被新 readme 解引用，文件保留作上游素材。

## 后果

- 正面: 安装包、数据目录、更新、深链、崩溃上报缓存全部与上游安装物理隔离；fork 出包不会再向上游拉取更新（消除「fork 更新劫持回上游」风险）；GitHub 面板对外呈现 threetwoa 品牌。
- 代价: 深链 aionui:// 失效（上游文档里的链接不再拉起本 fork）；旧 ~/.aionui 用户数据不迁移（fresh start，属预期）；与 upstream 同步时品牌面文件（builder/深链/数据目录/i18n 品牌词/图标）会常态冲突，按次人工吸收。
- 未决: macOS .icns 为程序化生成的占位标（PNG 条目容器），若审美不满意需设计正稿后经 electron-builder 重打；threetwoa 正式 logo/图标设计待定稿。
