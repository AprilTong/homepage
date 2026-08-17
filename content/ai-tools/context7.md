---
title: "Context7"
description: "按库和版本为 AI 代理补充较新的开发文档与代码示例。"
type: "mcp"
order: 7
platforms: ["Codex", "Claude Code", "Cursor"]
tags: ["技术文档", "代码示例", "上下文"]
officialUrl: "https://github.com/upstash/context7"
repositoryUrl: "https://github.com/upstash/context7"
featured: false
draft: false
---

## 工具是什么

Context7 是 Upstash 提供的开发文档上下文服务。代理可以先解析库标识，再按主题读取对应框架或依赖的文档和代码示例，减少只依赖模型训练数据时出现的旧 API 和错误签名。

它适合补充文档上下文，不负责替你判断架构是否合理，也不能保证第三方文档本身没有错误。

## 适合哪些场景

- 使用更新较快的框架或 SDK。
- 需要核对某个版本的配置和 API。
- 模型给出的代码包含疑似过期用法。
- 希望回答附带更贴近官方文档的示例。

## 安装方式

Codex 可以通过 stdio 启动 Context7 MCP：

```bash
codex mcp add context7 -- npx -y @upstash/context7-mcp
```

Context7 可以无 Key 使用；官方建议配置 API Key 以获得更高限额。Key 应通过环境变量传递，不要写入仓库。

## 配置示例

```toml
[mcp_servers.context7]
command = "npx"
args = ["-y", "@upstash/context7-mcp"]
env_vars = ["CONTEXT7_API_KEY"]
```

在启动 Codex 前，由本地环境提供可选变量：

```bash
export CONTEXT7_API_KEY="<your-api-key>"
```

## 使用示例

```text
使用 Context7 查找 Nuxt Content 3 的集合查询方式，然后说明如何按自定义 order 字段排序。
```

## 注意事项

- 文档会随上游变化，关键生产配置仍应打开官方来源复核。
- API Key 只放在环境变量或安全凭据存储中，不要提交到 `config.toml` 或 `.env`。
- 查询文档会增加上下文和延迟，只在版本或 API 准确性重要时调用。

## 官方链接

- [Context7 官方仓库](https://github.com/upstash/context7)
- [Context7 网站](https://context7.com/)
