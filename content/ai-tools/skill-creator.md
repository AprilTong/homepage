---
title: "Skill Creator"
description: "把重复工作整理成可触发、可测试、可迭代的 Agent Skill。"
type: "skill"
order: 4
platforms: ["Codex", "Claude Code"]
tags: ["Skill 开发", "评估", "工作流"]
officialUrl: "https://www.skills.sh/anthropics/skills/skill-creator"
repositoryUrl: "https://github.com/anthropics/skills"
featured: false
draft: false
---

## 工具是什么

Skill Creator 用于创建和改进 Agent Skill。它会帮助用户明确触发条件、编写 `SKILL.md`、准备真实测试提示，并比较启用与未启用 Skill 时的结果。

它适合把团队规范、固定输出格式或重复流程从零散提示词整理成可复用能力。

## 适合哪些场景

- 经常重复粘贴同一套任务要求。
- 团队需要统一代码审查、文档或汇报格式。
- 已有 Skill 容易误触发或漏触发，需要改进描述。
- 希望用测试用例评估 Skill 是否真正提升结果。

## 安装方式

```bash
npx skills add https://github.com/anthropics/skills --skill skill-creator
```

Codex 通常也内置或提供同名系统 Skill；如果当前客户端已经列出 `skill-creator`，无需重复安装第三方副本。

## 配置示例

```text
$skill-creator 创建一个 Skill：收到中文 API 变更时，生成包含兼容性说明和迁移步骤的发布文档。
```

一个 Skill 的最小入口文件包含名称、描述和正文说明：

```markdown
---
name: release-notes
description: 当用户需要根据 API 变更编写中文发布说明时使用
---

# 发布说明工作流
```

## 使用示例

```text
我已经有一份 SKILL.md。请为它设计 6 个应触发和 6 个不应触发的测试提示，并根据结果优化 description。
```

## 注意事项

- Skill 的描述决定何时加载，应该围绕用户目标和触发条件编写。
- 不要在 Skill 中保存 API Key、Token 或私人数据。
- 带脚本的 Skill 需要额外测试路径安全、网络访问和失败处理。
- 新 Skill 应使用真实任务做回归测试，不能只检查文件格式。

## 官方链接

- [Skill Creator 详情](https://www.skills.sh/anthropics/skills/skill-creator)
- [Anthropic Skills 仓库](https://github.com/anthropics/skills)
