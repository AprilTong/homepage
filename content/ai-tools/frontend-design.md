---
title: "Frontend Design"
description: "帮助 AI 在编码前确定视觉方向，并生成有辨识度、可投入生产的前端界面。"
type: "skill"
order: 9
platforms: ["Codex", "Claude Code", "Cursor"]
tags: ["前端设计", "视觉方向", "UI"]
officialUrl: "https://www.skills.sh/anthropics/skills/frontend-design"
repositoryUrl: "https://github.com/anthropics/skills"
featured: false
draft: false
---

## 工具是什么

Frontend Design 是 Anthropic 提供的前端设计 Skill。它要求代理先理解页面目的、受众和技术约束，再选择明确的视觉方向，并把字体、色彩、布局、动效和细节落实为可以运行的界面代码。

它重点减少缺少语境的通用 Hero、模板化卡片和重复的 AI 视觉风格，让设计选择服务于具体产品，而不是只做表面装饰。

## 适合哪些场景

- 从零构建落地页、仪表盘、作品集或 Web 应用。
- 现有功能完整，但界面缺少鲜明的视觉方向。
- 需要在编码前确定字体、色彩、空间和标志性元素。
- 希望生成的页面兼顾响应式、键盘操作和减少动效设置。

## 安装方式

通过 Skills CLI 安装指定 Skill：

```bash
npx skills add anthropics/skills --skill frontend-design
```

安装前应查看仓库中的 `SKILL.md` 和许可说明，确认内容适合当前项目与客户端。

## 配置示例

Skill 不需要额外运行时服务。安装完成后，在设计任务中明确调用，并提供产品语境和现有约束：

```text
$frontend-design 为独立开发者的错误监控产品设计首页。保留现有组件库和品牌蓝色，先说明视觉方向，再实现响应式页面。
```

## 使用示例

```text
重新设计这个项目的工具详情页。不要改动数据结构，复用现有 CSS 变量，并让排版、留白和交互层级更有辨识度。
```

## 注意事项

- Skill 提供的是设计指导，不能替代用户研究、品牌规范和真实可用性测试。
- 对已有设计系统，应明确要求复用组件、字体和设计 Token。
- 有辨识度不等于堆叠装饰，视觉复杂度应与产品目标匹配。
- 安装第三方 Skill 前检查指令、脚本和许可，不要盲目信任自动执行内容。

## 官方链接

- [Frontend Design 详情](https://www.skills.sh/anthropics/skills/frontend-design)
- [Anthropic Skills 官方仓库](https://github.com/anthropics/skills)
- [Frontend Design SKILL.md](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md)
