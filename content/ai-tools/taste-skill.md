---
title: "Taste Skill"
description: "通过版式、字体、色彩、动效和间距规则，减少千篇一律的 AI 前端设计。"
type: "skill"
order: 2
platforms: ["Codex", "Claude Code", "Cursor"]
tags: ["前端设计", "UI", "视觉规范"]
officialUrl: "https://www.tasteskill.dev/docs"
repositoryUrl: "https://github.com/Leonxlnx/taste-skill"
featured: true
draft: false
---

## 工具是什么

Taste Skill 是一组面向 AI 前端生成的设计约束。它要求代理更认真地处理版式层级、字体、色彩、留白和动效，减少模板化 Hero、随意渐变和缺乏重点的卡片堆叠。

默认的 `design-taste-frontend` 适合新页面设计；仓库还提供面向重设计、图片转代码和特定视觉风格的变体。

## 适合哪些场景

- 从零设计落地页、作品集或产品页面。
- 已有功能可用，但视觉层级和细节比较普通。
- 希望 AI 在写代码前先形成明确的审美方向。
- 需要统一间距、字体和交互动效规则。

## 安装方式

安装默认的前端设计 Skill：

```bash
npx skills add https://github.com/Leonxlnx/taste-skill --skill design-taste-frontend
```

如果希望安装仓库中的全部 Skills：

```bash
npx skills add Leonxlnx/taste-skill
```

## 配置示例

Codex 和其他支持 `SKILL.md` 的代理通常不需要额外运行时配置。安装到用户级或项目级目录后，用自然语言描述界面目标，并明确调用对应 Skill。

```text
$design-taste-frontend 为这个个人工具箱设计一个克制、清晰的深色界面。
```

## 使用示例

```text
保留现有品牌色和信息结构，重新设计首页。请重点改善字体层级、留白与移动端节奏。
```

## 注意事项

- 审美规则不能替代真实用户研究、品牌规范和可访问性测试。
- 对已有设计系统，应在提示中明确要求复用现有组件和设计 Token。
- 仓库可能提供实验版与稳定版，升级前先查看官方文档的稳定性说明。
- 安装前检查 Skill 内容和附带脚本，不要盲目信任第三方指令。

## 官方链接

- [Taste Skill 文档](https://www.tasteskill.dev/docs)
- [Taste Skill 官方仓库](https://github.com/Leonxlnx/taste-skill)
