# ADR-0002: README 重设计与 fork 封面（cover）

- **状态**: Accepted
- **日期**: 2026-09-16
- **决策人**: 仓库所有者（Aafff623）
- **关联**: [ADR-0001](0001-fork-governance-baseline.md)（部分修订其「只增不改」边界）

## 背景

所有者要求对 readme.md 做视觉与结构优化：README 部分严格遵循 [oil-oil/beautify-github-readme](https://github.com/oil-oil/beautify-github-readme) 规范，首图（cover）遵循 [oil-oil/oil-cover](https://github.com/oil-oil/oil-cover) 的视觉规范，生图经 chatgpt-collab 流水线（网页端 GPT 通道）完成。

## 决策

1. **修订 ADR-0001 边界**: `readme.md` 由「不改」转为「fork 重写」。上游原版仍完整存在于 git 历史与 upstream 仓库，多语言产品介绍保留于 `docs/readme/` 并在页脚链接。其余上游文件（`AGENTS.md`、`CLAUDE.md`、`.gitignore`、`.claude/` 等）维持「不改」不变。
2. **内容架构**: 按规范默认序列 Hero（名字 + 一句话价值）→ 证据（真实对比表 + 能力清单）→ 机制（架构图）→ 上手 → Fork 说明 → License；能力描述只取上游 README 既有功能与已验证架构事实，不编造。
3. **视觉系统**: 走规范的 Monochrome technical direction——源自项目真实识别（logo 为纯黑白）：墨黑 `#0A0C0E` / 暖白 `#F2F4F6` / 灰 `#9AA7B2`，单一品牌强调色取上游徽章绿 `#32CD32`；母题为「多 Agent 汇入一个工作台」；全部 SVG 自带深色背景保证双主题可读，1200 viewBox，系统字体。
4. **视觉资产**: `assets/readme/` 下 4 个章节标题 SVG（1200×140）+ 1 张架构系统图 SVG（1200×380）；cover 为 AI 生成位图 `cover.png`（oil-cover 风格：真实屏幕证据 + Apple-like 视觉 + 清晰标题 + 无人物 + 柔和 pastel 氛围层），生成需求单存 `assets/readme/source/cover-prompt.txt`。SVG 保持纯确定性，不嵌位图。
5. **语言**: fork 首页以中文为主（所有者工作语言），产品术语保留英文；上游 9 语言翻译文档保留原位。

## 后果

- 正面: fork 首页与上游定位区隔清楚（二创工作台 vs 产品营销页）；视觉与项目识别（黑白 logo）同源；内容可搜索、命令可复制（规范质量线）。
- 代价: 同步 upstream 对 `readme.md` 的后续改动不再自动适用，需要按次人工评估吸收。
