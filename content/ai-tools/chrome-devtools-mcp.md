---
title: "Chrome DevTools MCP"
description: "让 AI 代理控制和检查 Chrome，读取控制台、网络请求与性能数据。"
type: "mcp"
order: 6
platforms: ["Codex", "Claude Code", "Cursor"]
tags: ["Chrome", "调试", "性能分析"]
officialUrl: "https://github.com/ChromeDevTools/chrome-devtools-mcp"
repositoryUrl: "https://github.com/ChromeDevTools/chrome-devtools-mcp"
featured: true
draft: false
---

## 工具是什么

Chrome DevTools MCP 是 Chrome DevTools 团队维护的浏览器工具服务。它让 AI 代理通过 Chrome DevTools 能力操作页面、查看控制台错误、分析网络请求、获取截图并记录性能 Trace。

它更偏向真实 Chrome 环境的调试与性能分析，而不是替代完整的端到端测试套件。

## 适合哪些场景

- 复现并定位浏览器控制台错误。
- 查看接口请求、响应和加载失败原因。
- 检查页面性能和 Core Web Vitals 相关问题。
- 在本地应用中执行可见的浏览器交互。

## 安装方式

```bash
codex mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest
```

需要本机安装当前稳定版 Chrome 或 Chrome for Testing，并具备 Node.js LTS 环境。

## 配置示例

使用精简、无界面模式运行基础浏览器操作：

```toml
[mcp_servers.chrome-devtools]
command = "npx"
args = ["-y", "chrome-devtools-mcp@latest", "--slim", "--headless"]
```

如果不希望发送匿名使用统计，可以在参数中加入 `--no-usage-statistics`。

## 使用示例

```text
打开本地首页，检查控制台错误和失败的网络请求，再记录一次页面加载性能 Trace。
```

## 注意事项

- MCP 可以读取、操作浏览器中的页面数据。不要在同一浏览器配置中打开敏感账号或私人内容。
- 开启远程调试端口会扩大本机攻击面，只在需要时开启，并避免绑定到公共网络接口。
- 默认可能收集工具调用成功率、延迟和环境信息；可按官方说明关闭统计。
- AI 操作不能替代可重复的自动化测试，修复问题后仍应补充回归测试。

## 官方链接

- [Chrome DevTools MCP 官方仓库](https://github.com/ChromeDevTools/chrome-devtools-mcp)
- [工具参考](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/tool-reference.md)
