# ADR-0004: 版本号与发布规则（tag 命名 / package.json 版本 / 更新比较）

- **状态**: Proposed（待仓库所有者确认后转 Accepted）
- **日期**: 2026-09-16
- **决策人**: 待定（提案：ZCode 会话）
- **关联**: [ADR-0001](0001-fork-governance-baseline.md)、[ADR-0003](0003-rebrand-threetwoa.md)
- **依据**: `temp/analysis/fork-v2.2.2-fork.1-post-release-review.md`（源码取证）

## 背景

fork 已发布首个 release `v2.2.2-fork.1`（纯源码，package.json 版本保持 `2.2.2`）。两条更新检查链路——自动更新（`process/services/autoUpdaterService.ts:649`）与手动检查（`process/bridge/updateBridge.ts:679-685`，注释明确"pure semver"）——都用**严格** `gt(feedVersion, installedVersion)` 判定，即 channel 清单里的版本必须**严格大于** `app.getVersion()` 才会推送更新。

semver 规则下，`2.2.2-fork.1` 是 `2.2.2` 的 prerelease，排序**小于** `2.2.2`。因此：若未来把 `x.y.z-fork.N` 后缀写进 package.json，channel 清单的 version 会恒不大于已装版本，**更新永远不会被推送**；`app.getVersion()` 也会带上 prerelease 后缀，影响所有基于 semver 的比较与展示。

fork 采用 `vX.Y.Z-fork.N` 格式的 tag 是为了避免与 upstream 同名 tag 冲突（已发布的惯例），tag 名本身不参与任何版本比较——冲突点在"tag 名是否等于 package.json 版本"这一隐含假设上。

## 决策

1. **tag 名与 package.json 版本解耦**：tag 继续用 `vX.Y.Z-fork.N` 风格（`N` 为同基线内的 fork 发布序号），仅作发布标识；**任何自动化逻辑不得读取 tag 名参与版本比较**。
2. **纯源码 release**（无构建产物，如 `v2.2.2-fork.1`）：package.json 版本保持与上游基线一致，**不 bump**。
3. **含构建产物的 release**（产出安装包与 `latest*.yml`）：package.json 必须 bump 为**严格大于当前已分发版本**的普通 semver（三段式、无 prerelease 后缀），例如 `2.2.3`；该值即 channel 清单的 `version`（`scripts/prepare-release-assets.sh:120` 取证）。**禁止**把 `-fork.N`、`-dev.N` 等后缀写进 package.json。
4. 若将来需要并行的 fork 预发布通道，走 electron-builder channel 机制（`latest-<channel>.yml` + `allowPrerelease`），而不是 semver prerelease 后缀——当前不启用，仅作演进方向记录。

## 后果

- 正面：更新比较语义在源码版/产物版两种 release 下一致；不会出现"发了包但没人能收到更新"的静默失效；tag 名继续规避与 upstream 的冲突。
- 代价：tag 名与 app 关于页显示的版本号可能不同（如 tag `v2.2.3-fork.1` 对应 app `2.2.3`），溯源依赖 CHANGELOG 与 ADR 记录；首次含产物 release 的版本号最低为 `2.2.3`（或 bump-version 流程给出的更高值）。
- 未决：首次含产物 release 时是否同步 bump `aioncoreVersion`，按 `.claude/skills/bump-version` 流程逐次决策。
