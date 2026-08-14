---
title: "Sentry MCP"
description: "连接 Sentry 的错误、Issue 与性能数据，辅助 AI 代理排查生产环境问题。"
type: "mcp"
order: 12
platforms: ["Codex", "Claude Code", "Cursor"]
tags: ["Sentry", "错误排查", "可观测性"]
officialUrl: "https://mcp.sentry.dev/"
repositoryUrl: "https://github.com/getsentry/sentry-mcp"
featured: false
draft: false
---

## 工具是什么

Sentry MCP 是 Sentry 官方为人机协作式编程代理提供的 MCP 服务。它可以搜索错误和事件、查看 Issue、分析性能数据，并把生产环境上下文带入调试过程。

官方远程服务作为 Sentry API 的中间层，通过 OAuth 连接账号；它面向开发和排障工作流，不覆盖全部 Sentry 管理能力。

## 适合哪些场景

- 根据错误信息、堆栈和事件上下文定位生产问题。
- 查询某个项目近期出现频率较高的 Issue。
- 结合 Trace 和性能数据分析慢请求。
- 在修复前收集影响范围、首次出现时间和相关版本。

## 安装方式

在支持远程 HTTP MCP 的客户端中配置官方服务地址。建议限制到具体组织和项目：

```toml
[mcp_servers.sentry]
url = "https://mcp.sentry.dev/mcp/ORG_SLUG/PROJECT_SLUG"
```

首次连接会触发 OAuth 授权流程。只有确实需要跨项目查询时，才使用未限定范围的 `https://mcp.sentry.dev/mcp`。

## 配置示例

自托管 Sentry 或不支持远程 OAuth 的环境可以使用 stdio 方式：

```bash
npx @sentry/mcp-server@latest --access-token=YOUR_SENTRY_TOKEN --host=sentry.example.com
```

显式 Token 方式属于进阶配置，应通过安全的环境或密钥管理机制提供凭据，不要提交到仓库。

## 使用示例

```text
查找这个项目过去 24 小时新出现且影响用户最多的 Issue，汇总堆栈、版本和环境信息，不要修改 Issue 状态。
```

## 注意事项

- 优先使用项目级 OAuth 地址和最小权限，避免让代理访问无关组织或项目。
- 错误事件可能包含用户信息、请求参数和业务数据，输出和日志中应继续执行脱敏规则。
- AI 搜索、归因和修复建议可能不完整，生产变更前必须人工验证。
- 自托管部署的部分能力可能与 Sentry SaaS 不同；AI 搜索工具还可能需要额外模型提供商配置。

## 官方链接

- [Sentry MCP 官方服务](https://mcp.sentry.dev/)
- [Sentry MCP 官方仓库](https://github.com/getsentry/sentry-mcp)
