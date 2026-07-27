# 旧文章迁移与文章页面设计规格

## 1. 背景与目标

新版博客已经完成以 AI 对话为主体的首页。本阶段将旧 VuePress 博客中的全部文章迁移到 Nuxt Content，并实现常规的文章列表与文章详情页。

旧站正文位于 `/Users/april/Downloads/april/blog/docs`。审计结果如下：

- 共 100 篇正文，不含各目录的 `README.md` 索引页。
- 25 篇缺少发布日期。
- 17 篇缺少 frontmatter 标题。
- 文章包含技术笔记、简单算法和生活随笔，全部公开迁移。
- 旧 VuePress 配置包含插件配置和敏感凭据，不属于迁移范围。

## 2. 已确认的设计决策

- 全量迁移 100 篇旧文章，包括 `others` 目录中的生活随笔。
- 新地址采用稳定数字路径，例如 `/articles/vue/21`。
- 旧地址通过 HTTP 301 永久重定向到新地址。
- 分类沿用旧内容结构，标签保留并用于筛选。
- 文章列表和详情使用常规博客布局，不增加复杂交互或动画。
- 缺少日期时使用旧 Git 仓库中该文件的首次提交日期。
- 缺少标题时优先使用正文第一个 Markdown 标题；没有合适标题时根据正文主题生成简短标题。
- 正文内容保持原意，只修复 frontmatter、资源路径、失效的站内链接和 Nuxt Content 兼容问题。

## 3. 信息架构

### 3.1 路由

- `/`：AI 对话首页，保持现状。
- `/articles`：全部文章列表。
- `/articles/:category/:id`：文章详情。

分类与路径映射如下：

| 旧目录 | 新分类标识 | 展示名称 | 新路径示例 |
| --- | --- | --- | --- |
| `accumulate/vue` | `vue` | Vue | `/articles/vue/21` |
| `accumulate/js` | `javascript` | JavaScript | `/articles/javascript/23` |
| `accumulate/css` | `css` | CSS | `/articles/css/14` |
| `accumulate/tool` | `tools` | 工具 | `/articles/tools/14` |
| `accumulate/buildTool` | `engineering` | 工程化 | `/articles/engineering/1` |
| `accumulate/periphery` | `periphery` | 周边技术 | `/articles/periphery/8` |
| `algorithm` | `algorithm` | 简单算法 | `/articles/algorithm/7` |
| `others` | `life` | 生活随笔 | `/articles/life/13` |

### 3.2 旧地址重定向

每篇文章保留显式的旧路径映射。以下形式均重定向到新地址：

- `/accumulate/vue/21.html`
- `/accumulate/vue/21`
- `/algorithm/7.html`
- `/others/13.html`

目录入口按以下规则处理：

- `/accumulate/`、`/categories/` 和 `/tag/` 重定向到 `/articles`。
- `/timeline/` 暂时重定向到 `/articles`，待时间轴页面实现后替换。
- `/chat` 重定向到 `/`。

重定向响应必须使用 301，不能依赖客户端跳转。

## 4. 内容模型与迁移规则

### 4.1 Nuxt Content 模型

每篇文章包含以下字段：

```yaml
title: CSS :has() 指南
description: CSS :has() 关系选择器的使用方法与示例。
date: 2024-06-06
category: css
categoryLabel: CSS
tags:
  - CSS
legacyPaths:
  - /accumulate/css/13.html
  - /accumulate/css/13
draft: false
```

文件存放在 `content/articles/:category/:id.md`。Nuxt Content 页面集合使用 `/articles` 前缀，因此生成路径与文件位置一致。

### 4.2 frontmatter 标准化

- 删除 VuePress 专属的 `sidebar` 和 `sidebarDepth`。
- 保留合法的 `title`、`date` 和 `tags`。
- 将日期统一为 `YYYY-MM-DD` 字符串。
- 空标签统一为 `[]`。
- 增加 `category`、`categoryLabel`、`legacyPaths` 和 `draft: false`。
- `description` 从正文首段提取纯文本，限制为适合 SEO 摘要的长度；没有可用首段时使用标题生成简短描述。

### 4.3 缺失字段

- 缺少日期：运行 `git log --follow --format=%as --reverse -- <file>`，使用首个有效日期。
- 缺少标题：依次尝试第一个一级至六级 Markdown 标题、旧侧边栏标题、正文主题。
- 自动补齐结果写入迁移清单，便于人工抽查。
- 清单记录每篇原始 Markdown 的 SHA-256，并标记标题或日期的补齐来源，
  使脏工作树中的实际迁移输入仍可追溯。

### 4.4 正文与资源

- 保留 Markdown 段落、列表、引用、代码块和远程图片。
- 本地图片复制到 `public/articles/<category>/<id>/`，正文引用改为绝对站内路径。
- 使用 Markdown AST 的节点位置修复指向旧 `.html` 页面的相对链接，使其指向
  新文章路径；只替换链接目标，不重新序列化或重排正文。
- 示例代码中的路径、HTML 标签和字符串不做替换。
- 不迁移旧站生成目录、主题样式、评论插件、鼠标特效或看板娘资源。
- 不迁移任何 OAuth Secret、访问令牌或其他凭据。

## 5. 页面设计

### 5.1 文章列表

文章列表延续深蓝黑背景和顶部胶囊导航，主内容使用低透明度玻璃面板。

列表内容包括：

- 页面标题和文章总数。
- 「全部」及 8 个分类筛选按钮。
- 当前结果涉及的标签筛选。
- 按日期倒序排列的文章条目。
- 每条展示标题、摘要、日期、分类和标签。
- 分类或标签无结果时展示明确的空状态和重置入口。

筛选状态写入查询参数，例如 `/articles?category=vue&tag=Vue`，便于刷新和分享。

### 5.2 文章详情

详情页采用单栏阅读布局：

- 返回文章列表。
- 标题、发布日期、分类和标签。
- Markdown 正文。
- 自动生成的文章目录。
- 上一篇和下一篇导航，顺序与文章列表一致。
- 无匹配文章时返回 Nuxt 404 页面和正确的 HTTP 状态。

详情页正文优先保证可读性：限制行宽、代码块允许横向滚动、图片自适应、表格在窄屏下可滚动。

## 6. 数据流与组件边界

- `scripts/migrate-legacy-content.mjs`：读取旧文章、标准化元数据、复制资源并生成迁移清单。
- `app/utils/article-taxonomy.ts`：分类配置、旧目录到新分类的纯函数映射。
- `app/composables/useArticleFilters.ts`：读取查询参数并计算筛选结果。
- `app/components/articles/ArticleFilters.vue`：分类与标签筛选。
- `app/components/articles/ArticleList.vue`：文章条目与空状态。
- `app/components/articles/ArticleToc.vue`：详情页目录。
- `app/pages/articles/index.vue`：查询文章集合并装配列表页。
- `app/pages/articles/[category]/[id].vue`：查询、SEO、正文与相邻文章。
- `server/middleware/legacy-redirects.ts`：基于生成映射返回 301。

展示组件不直接读取文件系统，不在组件内维护重复的分类常量。

## 7. SEO、无障碍与安全

- 列表页和详情页配置唯一标题、描述、Canonical 和 Open Graph 元数据。
- 详情页输出 `BlogPosting` JSON-LD。
- 筛选按钮具有明确的选中状态和可访问名称。
- 文章目录使用语义化导航。
- 焦点样式、颜色对比和减少动态效果规则沿用首页。
- 外部链接使用安全属性，站内链接使用 Nuxt 路由。
- 迁移器不得改写 fenced code、缩进代码块、行内代码或 HTML 注释中的示例链接。
- Markdown 不允许通过迁移过程注入脚本或事件处理器。
- Raw HTML 使用 HTML 解析器检查元素与 URL 属性，不使用正则表达式解析标签。
- 本地资源和正文源文件不得通过符号链接越出旧站 `docs` 目录。
- 旧 VuePress 配置中发现的 GitHub OAuth 客户端密钥不进入新仓库；现有密钥应在 GitHub 中撤销或轮换。

## 8. 错误处理

- 任一文章缺少可恢复的标题或日期时，迁移脚本以非零状态退出并报告文件路径。
- 新路径、旧路径或内容 ID 重复时，迁移脚本失败。
- 本地资源不存在时，迁移脚本报告断链，不能静默忽略。
- 所有产物先写入 staging 并验证；提交阶段发生可捕获的文件系统错误时，
  恢复提交前快照。SIGKILL、断电等进程外中断的自动恢复不属于本阶段，
  残留 backup 目录必须保留并可见，供人工恢复。
- 详情页查询不到文章时抛出 404。
- 非法分类查询显示空结果，不影响页面渲染。

## 9. 测试与验收

### 9.1 自动化测试

- 分类映射覆盖全部 8 个旧目录。
- 迁移结果恰好包含 100 篇正文。
- 所有文章都有合法标题、日期、分类、描述和唯一新路径。
- 每个旧路径只映射到一篇新文章。
- 本地资源和站内链接不存在断链。
- 列表页按日期倒序，并能按分类和标签筛选。
- 详情页正确渲染正文、目录、SEO 和相邻文章。
- 旧地址返回 301 且 `Location` 正确。
- 全量测试、类型检查和生产构建通过。

### 9.2 浏览器验收

- 桌面端和移动端检查文章列表。
- 验证分类与标签筛选和 URL 查询参数同步。
- 打开技术文章和生活随笔各至少 2 篇。
- 检查长代码块、表格、图片和目录。
- 验证不存在横向页面溢出、控制台错误和水合错误。

## 10. 本阶段不包含

- 全文搜索。
- 评论系统。
- RSS、站点地图和独立时间轴页面。
- KnowFlow AI 真实 SSE 接入。
- 对旧文章内容进行大规模重写或技术更新。
- 迁移提交过程在断电或 SIGKILL 后的自动 journal 恢复。
