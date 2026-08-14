---
title: "Superpowers"
description: "用结构化工作流约束 AI 编程过程，从需求澄清一直覆盖到测试与验证。"
type: "skill"
order: 1
platforms: ["Codex", "Claude Code", "Cursor"]
tags: ["工程流程", "TDD", "调试"]
officialUrl: "https://github.com/obra/superpowers"
repositoryUrl: "https://github.com/obra/superpowers"
featured: true
draft: false
---

## 工具是什么

Superpowers 是一组面向 AI 编程代理的工作流 Skills。它把需求梳理、实现计划、测试驱动开发、系统化调试、代码审查和完成前验证串成一套可重复的工程流程。

它不是用来增加模型能调用的数据源，而是告诉代理在不同阶段应该按什么顺序工作、何时停下来确认，以及用什么证据证明任务完成。

## 适合哪些场景

- 中大型功能需要先明确需求和边界。
- 希望代理坚持先写测试，再写实现。
- 遇到复杂故障时，避免反复猜测和试错。
- 长任务需要用计划、检查点和提交保持可追踪。

## 安装方式

通用 Agent Skills 客户端可以通过 Skills CLI 安装仓库中的 Skills：

```bash
npx skills add obra/superpowers
```

Superpowers 还包含针对不同代理的启动集成。Codex、Claude Code 和 Cursor 的接入方式可能不同，安装后应继续阅读仓库中对应平台的安装说明。

## 配置示例

如果只想安装其中一个工作流，可以显式选择 Skill：

```bash
npx skills add obra/superpowers --skill systematic-debugging
```

在 Codex 中可以通过名称明确调用已安装的 Skill：

```text
$systematic-debugging 帮我定位这个测试为什么失败
```

## 使用示例

```text
请先使用 brainstorming 梳理这个功能，得到确认后再编写实现计划。
```

```text
使用 verification-before-completion 检查测试、类型检查和构建结果。
```

## 注意事项

- 这套流程会增加前期沟通和测试成本，小型一次性脚本不一定需要完整启用。
- Skills 可以包含脚本和额外资源。安装前先查看仓库内容与 `SKILL.md`，确认来源可信。
- 单独复制 Skill 文件可能缺少平台启动集成，完整使用方式以官方仓库为准。

## 官方链接

- [Superpowers 官方仓库](https://github.com/obra/superpowers)
- [Skills.sh 上的 Superpowers](https://www.skills.sh/obra/superpowers)
