# April Blog

基于 Nuxt 4、Nuxt Content 和 Vue 3 重构的个人博客。

首页目前提供知识库 Chat 的前端演示客户端；真实 KnowFlow API 与 SSE 流式响应尚未接入。文章归档已经迁移完成，可在 `/articles` 浏览 100 篇旧文章并进入详情页。

## 环境要求

- Node.js `^22.19.0 || ^24.11.0 || >=26.0.0`
- pnpm

如果终端提示 `pnpm: command not found`，优先使用 Corepack：

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm --version
```

如果当前 Node.js 安装不包含 Corepack，可先执行 `npm install --global corepack`，再运行上面的命令。

## 本地开发

```bash
pnpm install
pnpm dev
```

常用检查命令：

```bash
pnpm test
pnpm typecheck
pnpm build
```

## 文章迁移

迁移器读取旧 VuePress 项目根目录下的 `docs`，生成 100 篇 Nuxt Content 文章。可以通过环境变量指定旧项目的绝对路径：

```bash
LEGACY_BLOG_SOURCE=/绝对路径/旧博客 pnpm migrate:content
```

也可以使用命令行参数：

```bash
pnpm migrate:content -- --source /绝对路径/旧博客
```

迁移后运行独立校验：

```bash
pnpm verify:content
```

相关文件：

- `content/articles/`：迁移后的 Markdown 正文。
- `content/migration-manifest.json`：文章来源、目标路径、补全字段与来源哈希。
- `server/data/legacy-redirects.json`：旧文章地址到新地址的映射。

旧文章 URL 由服务端返回永久重定向（HTTP 301），例如 `/accumulate/vue/21.html` 会跳转到 `/articles/vue/21`。旧版栏目入口也会通过 Nuxt 路由规则跳转到 `/articles`。

## 常用路由

- `/`：知识库 Chat 演示首页。
- `/articles`：文章列表、分类与标签筛选。
- `/articles/:category/:id`：文章详情。
- `/ai-tools`：常用 Skills 与 MCP 工具目录，可按类型筛选。
- `/ai-tools/:slug`：工具说明、安装配置和使用示例。
- `/chat`：永久重定向到首页。

## 凭据安全

不要迁移旧 VuePress 配置中的 GitHub OAuth Secret，也不要把 API Key、Token、`.env` 或其他凭据提交到仓库。旧配置中曾出现过的 OAuth Secret 必须在 GitHub 中撤销或轮换；仅从代码中删除并不能使已经泄露的凭据失效。
