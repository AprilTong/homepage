---
title: "Find Skills"
description: "根据任务搜索 Agent Skills，并用来源、安装量和安全信息辅助筛选。"
type: "skill"
order: 3
platforms: ["Codex", "Claude Code", "Cursor"]
tags: ["工具发现", "Skills CLI", "工作流"]
officialUrl: "https://www.skills.sh/vercel-labs/skills/find-skills"
repositoryUrl: "https://github.com/vercel-labs/skills"
featured: false
draft: false
---

## 工具是什么

Find Skills 是 Vercel Labs 提供的发现型 Skill。用户描述想完成的任务后，它会先检查 Skills 生态中的成熟选项，再根据任务关键词搜索可安装的 Skill。

它的价值不只是返回搜索结果，还会提醒代理检查来源声誉、安装情况和安全审计，避免只凭名称推荐未知代码。

## 适合哪些场景

- 不确定某类工作是否已有现成 Skill。
- 想为测试、部署、设计或文档任务扩展代理能力。
- 希望比较多个 Skill 的来源和适用范围。
- 需要记住 Skills CLI 的搜索与安装流程。

## 安装方式

```bash
npx skills add https://github.com/vercel-labs/skills --skill find-skills
```

## 配置示例

安装完成后，可以直接描述目标：

```text
$find-skills 帮我找一个适合 Vue 无障碍审查的 Skill。
```

也可以直接使用 Skills CLI 搜索：

```bash
npx skills find "vue accessibility"
```

## 使用示例

```text
找一个可以帮助我编写 API 文档的 Skill。优先官方来源，并说明安装方式。
```

## 注意事项

- 搜索结果不代表安全或质量保证，安装前仍需查看仓库、`SKILL.md` 和安全审计。
- 安装量只能作为参考，不能替代对权限、脚本和维护状态的检查。
- 第三方 Skill 可能带有脚本或网络访问步骤，应在受控环境中验证。

## 官方链接

- [Find Skills 详情](https://www.skills.sh/vercel-labs/skills/find-skills)
- [Vercel Labs Skills 仓库](https://github.com/vercel-labs/skills)
