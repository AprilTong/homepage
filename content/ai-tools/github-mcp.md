---
title: "GitHub MCP"
description: "让 AI 代理读取和管理仓库、Issue、Pull Request、Actions 等 GitHub 资源。"
type: "mcp"
order: 8
platforms: ["Codex", "Claude Code", "VS Code"]
tags: ["GitHub", "代码协作", "Pull Request"]
officialUrl: "https://github.com/github/github-mcp-server"
repositoryUrl: "https://github.com/github/github-mcp-server"
featured: false
draft: false
---

## 工具是什么

GitHub MCP 是 GitHub 官方维护的 MCP Server。它可以让 AI 客户端读取仓库代码和提交，查询或管理 Issue、Pull Request、Actions、通知及其他 GitHub 资源。

远程服务由 GitHub 托管；也可以通过 Docker 或本地二进制运行自托管版本。

## 适合哪些场景

- 查询仓库结构、提交历史和代码文件。
- 整理 Issue、查看 Pull Request 或生成审查摘要。
- 分析 GitHub Actions 失败原因。
- 在明确授权后创建 Issue、评论或 Pull Request。

## 安装方式

Codex 使用 GitHub 远程 MCP 时，通过环境变量读取 Personal Access Token：

```bash
codex mcp add github --url https://api.githubcopilot.com/mcp/ --bearer-token-env-var GITHUB_PAT_TOKEN
```

在启动 Codex 前设置变量，变量值使用你自己创建的最小权限 Token：

```bash
export GITHUB_PAT_TOKEN="<your-token>"
```

## 配置示例

```toml
[mcp_servers.github]
url = "https://api.githubcopilot.com/mcp/"
bearer_token_env_var = "GITHUB_PAT_TOKEN"
```

初次使用建议只授予读取权限，需要写入 Issue 或 Pull Request 时再增加必要范围。

## 使用示例

```text
列出 owner/repo 最近 5 个未关闭 Issue，并按是否有复现步骤进行归类。不要修改任何内容。
```

## 注意事项

- GitHub MCP 可能拥有创建、修改或删除资源的能力。涉及写操作时应检查仓库和目标对象。
- Token 必须使用最小权限，并通过环境变量或凭据存储传递，绝不能提交到版本库。
- 公开演示、日志和截图中不要暴露 Token、私有仓库名称或敏感代码。
- 只启用任务需要的 Toolsets，可以降低误操作和上下文膨胀风险。

## 官方链接

- [GitHub MCP Server 官方仓库](https://github.com/github/github-mcp-server)
- [Codex 安装指南](https://github.com/github/github-mcp-server/blob/main/docs/installation-guides/install-codex.md)
