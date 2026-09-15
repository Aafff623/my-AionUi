# ADR-0001: Fork 治理基线（二创起点）

- **状态**: Accepted
- **日期**: 2026-09-16
- **决策人**: 仓库所有者（Aafff623）
- **基线**: upstream `iOfficeAI/AionUi` @ `6744099b`（v2.2.2，aioncore v0.2.2）

## 背景

本仓库是 `iOfficeAI/AionUi`（Apache-2.0）的个人 fork，用于二次创作（二创）。需要一套与上游长期共存、同步成本低、不污染上游文件的开发治理基线。网络环境到 GitHub 直连不稳定（TLS 频繁中断），且上游仓库完整历史体积大。

## 决策

1. **远端拓扑**: `origin` = `Aafff623/my-AionUi`（唯一 push 目标）；`upstream` = `iOfficeAI/AionUi`（同步源）。所有提交只推 origin。
2. **部分克隆（partial clone）**: 采用 `--filter=blob:none`，本地只保存提交/树对象，文件内容按需懒加载。历史同步与 `git log/blame` 全功能可用；代价是访问久远历史大文件时需要联网（走代理）补拉。
3. **TLS 稳定性**: 仓库级配置 `http.sslBackend=schannel` 与 `http.version=HTTP/1.1`，配合环境变量中的本地代理使用；解决 OpenSSL 栈下频繁的 `unexpected eof while reading` 断流。
4. **治理文件只增不改**: 不修改上游维护的 `AGENTS.md`、`CLAUDE.md`、`readme.md`、`.gitignore`、`.claude/`（上游自身的 agent 规范质量已经很高，fork 改写只会在每次同步 upstream 时制造冲突）。fork 特有上下文放新增文件：`CONTEXT.md`（领域事实）与本 `docs/adr/`（决策记录）。
5. **本地产物边界**: `temp/`（上游 `.gitignore` 已忽略）存放本地分析报告、脚本、机密；`.codegraph/` 代码索引通过 `.git/info/exclude` 本地忽略（上游 `.gitignore` 不动）；`.cursor/` 等本地 IDE 目录保持原样不提交。

## 后果

- 正面: 与上游同步几乎零冲突（只新增路径）；克隆/拉取流量小；治理边界清楚。
- 代价: 懒加载依赖网络与代理可用性；`git restore`/`checkout` 中断后需要断点重试（blob 缓存会累积，不会重复下载）。
- 未决: 与 upstream 的同步节奏（手动按需 `git fetch upstream` + merge/rebase），按实际改动逐次决策。
