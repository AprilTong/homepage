---
title: "Playwright MCP"
description: "通过结构化页面快照让 AI 代理执行浏览器操作、探索流程并维护持续会话。"
type: "mcp"
order: 11
platforms: ["Codex", "Claude Code", "Cursor"]
tags: ["浏览器自动化", "端到端测试", "Playwright"]
officialUrl: "https://github.com/microsoft/playwright-mcp"
repositoryUrl: "https://github.com/microsoft/playwright-mcp"
featured: false
draft: false
---

## 工具是什么

Playwright MCP 是 Microsoft 维护的浏览器 MCP 服务。它主要通过结构化的可访问性快照理解页面，让代理可以导航、点击、输入、读取状态、截图和执行持续的浏览器任务。

它适合需要页面结构推理、持续浏览器状态和探索性操作的代理循环，不等同于可以稳定重复运行的 Playwright Test 测试套件。

## 适合哪些场景

- 让代理操作本地应用并检查完整用户流程。
- 探索页面结构、表单状态和交互路径。
- 在同一浏览器会话中连续完成多步任务。
- 为正式端到端测试收集复现步骤和选择器线索。

## 安装方式

使用 Codex CLI 添加本地 MCP 服务：

```bash
codex mcp add playwright npx "@playwright/mcp@latest"
```

官方要求 Node.js 18 或更高版本，并需要可用的 MCP 客户端。

## 配置示例

也可以在 Codex 配置中声明服务：

```toml
[mcp_servers.playwright]
command = "npx"
args = ["@playwright/mcp@latest"]
```

## 使用示例

```text
打开本地 AI 工具页，确认工具总数和筛选结果，再进入 Playwright MCP 详情页并检查控制台错误。
```

## 注意事项

- 不要让代理在含私人账号、支付信息或敏感业务数据的浏览器上下文中执行不受控操作。
- 页面内容可能包含恶意提示，重要操作前应检查目标和影响范围。
- 探索性操作不能替代稳定的端到端测试；修复后应补充可重复回归用例。
- 对外部站点自动化时遵守服务条款、访问频率和数据使用要求。

## 官方链接

- [Playwright MCP 官方仓库](https://github.com/microsoft/playwright-mcp)
- [Playwright 项目](https://github.com/microsoft/playwright)
