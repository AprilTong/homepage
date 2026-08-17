---
title: "Web Design Guidelines"
description: "按可访问性、交互、排版、动效和性能规则审查已有 Web 界面。"
type: "skill"
order: 10
platforms: ["Codex", "Claude Code", "Cursor"]
tags: ["可访问性", "交互检查", "Web 规范"]
officialUrl: "https://www.skills.sh/vercel-labs/agent-skills/web-design-guidelines"
repositoryUrl: "https://github.com/vercel-labs/agent-skills"
featured: false
draft: false
---

## 工具是什么

Web Design Guidelines 是 Vercel Agent Skills 中的界面审查 Skill。它根据 Web Interface Guidelines 检查可访问性、焦点状态、表单、动效、排版、图片、导航状态和性能等问题。

它更适合在已有页面上发现具体问题并提出修正建议，与负责形成新视觉方向的 Frontend Design 定位不同。

## 适合哪些场景

- 发布前审查页面的键盘操作、语义结构和焦点状态。
- 检查表单标签、自动填充、错误提示和提交反馈。
- 发现不尊重减少动效、触摸尺寸或深色模式的实现。
- 对 AI 生成的界面进行一次系统化质量检查。

## 安装方式

通过 Skills CLI 安装指定 Skill：

```bash
npx skills add vercel-labs/agent-skills --skill web-design-guidelines
```

## 配置示例

安装后可以把审查范围、目标文件和输出格式写入请求：

```text
$web-design-guidelines 审查 app/pages/ai-tools 和相关组件，按严重程度列出问题，并为每项提供文件位置和修复建议。
```

## 使用示例

```text
检查这个表单的键盘操作、可访问名称、错误反馈、移动端输入字号和减少动效支持。只报告可以从代码中验证的问题。
```

## 注意事项

- 自动审查不能替代屏幕阅读器、真实键盘和多设备测试。
- 部分规则包含 Vercel 的产品偏好，不一定适合所有品牌和技术栈。
- 修改前应区分通用 Web 问题与项目有意采用的设计约束。
- 审查结论需要结合浏览器行为、用户数据和项目质量门禁验证。

## 官方链接

- [Web Design Guidelines 详情](https://www.skills.sh/vercel-labs/agent-skills/web-design-guidelines)
- [Vercel Agent Skills 官方仓库](https://github.com/vercel-labs/agent-skills)
- [Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines)
