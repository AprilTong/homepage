---
title: "Figma MCP"
description: "把 Figma 设计稿、组件、变量与布局上下文连接到支持 MCP 的 AI 客户端。"
type: "mcp"
order: 5
platforms: ["Codex", "Claude Code", "Cursor"]
tags: ["Figma", "设计转代码", "设计系统"]
officialUrl: "https://developers.figma.com/docs/figma-mcp-server/"
repositoryUrl: "https://github.com/figma/mcp-server-guide"
featured: true
draft: false
---

## 工具是什么

Figma MCP 是 Figma 官方提供的 MCP 服务。它允许 AI 客户端读取设计文件中的布局、变量、组件和资源；支持的客户端和账号还可以使用写入画布等能力。

Figma 官方建议多数用户使用 Remote MCP，因为它不依赖本地 Figma 桌面应用，并提供更完整的能力范围。

## 适合哪些场景

- 根据指定 Frame 生成前端代码。
- 查询组件、变量和 Auto Layout 信息。
- 让代码实现尽量复用现有设计系统。
- 在支持的工作流中创建或修改 Figma 画布内容。

## 安装方式

Codex CLI 可以直接添加 Figma Remote MCP：

```bash
codex mcp add figma --url https://mcp.figma.com/mcp
```

命令执行后按提示在浏览器完成 Figma 授权。Codex App 用户也可以在 Plugins 中安装 Figma 并完成授权。

## 配置示例

对应的 Codex `config.toml` 配置如下：

```toml
[mcp_servers.figma]
url = "https://mcp.figma.com/mcp"
```

完成连接后，可在 Codex 中查看已注册的 MCP 工具。

## 使用示例

```text
读取这个 Figma 链接中的登录页，列出使用到的组件、颜色变量和主要间距，然后用现有 Vue 组件实现。
```

## 注意事项

- 授权范围可能允许代理读取设计文件或写入画布，执行写操作前应再次确认目标文件。
- 不要向无关任务提供包含未发布产品或客户信息的设计链接。
- Remote MCP 的能力和可用客户端可能变化，连接前查看官方兼容目录。
- 生成代码仍需要人工检查响应式、可访问性和对现有组件的复用情况。

## 官方链接

- [Figma MCP 官方文档](https://developers.figma.com/docs/figma-mcp-server/)
- [Remote MCP 安装说明](https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/)
