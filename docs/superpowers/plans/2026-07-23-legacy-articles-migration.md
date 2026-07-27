# 旧文章迁移与文章页面实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将旧 VuePress 博客的 100 篇正文完整迁移到 Nuxt Content，并实现文章列表、文章详情和旧地址 301 重定向。

**架构：** 使用可重复执行的 Node.js 迁移器将旧 Markdown 标准化到 `content/articles`，同时生成机器可读的迁移清单和重定向映射。Nuxt 页面只通过 `queryCollection` 读取文章集合；筛选、分类映射和旧地址解析均拆成纯函数，以便通过 TDD 独立验证。

**技术栈：** Node.js 22、Nuxt 4、Nuxt Content v3、Vue 3、TypeScript、Vitest、Nuxt Test Utils、mdast-util-from-markdown、parse5。

---

## 文件结构

### 内容迁移

- `scripts/lib/legacy-content.mjs`：解析 frontmatter、补齐元数据、转换路径和生成文章记录。
- `shared/article-categories.json`：迁移器和前端共同使用的 8 个分类单一数据源。
- `scripts/migrate-legacy-content.mjs`：迁移命令入口、文件复制、清单输出和失败报告。
- `scripts/verify-migrated-content.mjs`：验证数量、字段、唯一性、链接和资源。
- `content/articles/<category>/<id>.md`：迁移后的 100 篇正文。
- `content/migration-manifest.json`：源文件、新路径、旧路径和补齐字段清单。
- `server/data/legacy-redirects.json`：旧路径到新路径的静态映射。
- `tests/fixtures/legacy-content/`：迁移器的最小测试夹具。
- `tests/unit/legacy-content.spec.ts`：迁移纯函数和边界条件测试。
- `tests/unit/migrated-content.spec.ts`：真实迁移结果完整性测试。

### 文章领域

- `content.config.ts`：文章集合 schema、路径前缀和索引。
- `app/types/article.ts`：列表组件使用的文章摘要类型。
- `app/utils/article-taxonomy.ts`：8 个分类配置和显示辅助函数。
- `app/composables/useArticleFilters.ts`：分类、标签和查询参数筛选逻辑。
- `app/components/articles/ArticleFilters.vue`：筛选控件。
- `app/components/articles/ArticleList.vue`：文章列表与空状态。
- `app/components/articles/ArticleToc.vue`：文章目录。
- `app/pages/articles/index.vue`：文章列表查询、SEO 与组件装配。
- `app/pages/articles/[category]/[id].vue`：文章查询、Markdown 渲染、SEO 与上一篇/下一篇。
- `tests/unit/article-taxonomy.spec.ts`：分类配置测试。
- `tests/unit/useArticleFilters.spec.ts`：筛选逻辑测试。
- `tests/nuxt/ArticleFilters.spec.ts`：筛选交互测试。
- `tests/nuxt/ArticleList.spec.ts`：列表渲染测试。
- `tests/nuxt/article-pages.spec.ts`：列表页和详情页集成测试。

### 重定向与样式

- `server/utils/legacy-redirect.ts`：规范化旧 URL 并查找目标。
- `server/middleware/legacy-redirects.ts`：返回 HTTP 301。
- `tests/unit/legacy-redirect.spec.ts`：旧路径解析测试。
- `tests/nuxt/legacy-redirects.spec.ts`：301 响应集成测试。
- `app/components/AppHeader.vue`：将文章入口切换为站内路由。
- `app/assets/css/main.css`：文章列表和阅读页样式。

## 任务 1：建立迁移器和分类模型

**文件：**

- 创建：`tests/fixtures/legacy-content/accumulate/vue/1.md`
- 创建：`tests/fixtures/legacy-content/others/2.md`
- 创建：`tests/unit/legacy-content.spec.ts`
- 创建：`tests/unit/article-taxonomy.spec.ts`
- 创建：`scripts/lib/legacy-content.mjs`
- 创建：`shared/article-categories.json`
- 创建：`app/utils/article-taxonomy.ts`
- 创建：`app/types/article.ts`

- [ ] **步骤 1：编写分类映射失败测试**

测试断言 8 个旧目录分别映射到 `vue`、`javascript`、`css`、`tools`、`engineering`、`periphery`、`algorithm` 和 `life`，未知目录返回 `null`。

- [ ] **步骤 2：运行测试并确认因模块缺失而失败**

运行：

```bash
pnpm vitest run tests/unit/article-taxonomy.spec.ts
```

预期：FAIL，提示无法导入 `app/utils/article-taxonomy.ts`。

- [ ] **步骤 3：实现分类常量和纯函数**

导出以下稳定接口：

```ts
export interface ArticleCategory {
  slug: string
  label: string
  legacyDirectory: string
}

export const articleCategories: readonly ArticleCategory[]
export function findCategoryByLegacyPath(path: string): ArticleCategory | null
export function getCategoryLabel(slug: string): string
```

- [ ] **步骤 4：编写迁移记录失败测试**

夹具覆盖：

- 保留已有标题、日期和标签。
- 使用首个 Markdown 标题补齐标题。
- 通过注入的 `resolveFirstCommitDate` 补齐日期。
- 删除 `sidebar` 和 `sidebarDepth`。
- 生成新路径、两个旧路径和摘要。
- frontmatter 中的模板示例不被误识别为文章字段。

- [ ] **步骤 5：运行迁移测试并确认因实现缺失而失败**

运行：

```bash
pnpm vitest run tests/unit/legacy-content.spec.ts
```

预期：FAIL，提示 `createArticleRecord` 未定义。

- [ ] **步骤 6：实现最小迁移纯函数**

`scripts/lib/legacy-content.mjs` 导出：

```js
export function parseLegacyArticle(source, sourcePath) {}
export function createArticleRecord(parsed, options) {}
export function serializeMigratedArticle(record) {}
export function rewriteLegacyLinks(markdown, manifest, sourcePath = '') {}
```

错误对象必须包含源文件路径，标题、日期或分类不可恢复时抛出异常。传入
`sourcePath` 时，链接重写函数使用旧文章所在目录解析 `./` 和 `../`，
再匹配迁移清单；未传入时继续支持绝对旧路径。

分类数据必须来自 `shared/article-categories.json`。前端分类辅助函数与迁移器
读取同一份 JSON，测试逐项验证两端结果，避免双份常量漂移。

标题与链接识别必须使用 `mdast-util-from-markdown` 的 AST 和源码位置。链接
转换只替换 `link` 与 `definition` 节点中的目标区间，不重新序列化 Markdown；
代码块、行内代码、HTML 注释和图片中的类似文本保持原样。

- [ ] **步骤 7：运行两个单元测试文件**

运行：

```bash
pnpm vitest run tests/unit/article-taxonomy.spec.ts tests/unit/legacy-content.spec.ts
```

预期：PASS。

- [ ] **步骤 8：提交任务**

```bash
git add shared/article-categories.json app/types/article.ts app/utils/article-taxonomy.ts scripts/lib/legacy-content.mjs tests/fixtures/legacy-content tests/unit/article-taxonomy.spec.ts tests/unit/legacy-content.spec.ts
git commit -m "feat(文章): 建立旧内容迁移模型"
```

## 任务 2：全量迁移并验证 100 篇文章

**文件：**

- 创建：`scripts/migrate-legacy-content.mjs`
- 创建：`scripts/verify-migrated-content.mjs`
- 创建：`tests/unit/migrated-content.spec.ts`
- 创建：`content/articles/<category>/<id>.md`
- 创建：`content/migration-manifest.json`
- 创建：`server/data/legacy-redirects.json`
- 修改：`package.json`
- 修改：`content.config.ts`
- 修改：`.gitignore`

- [ ] **步骤 1：编写真实迁移结果失败测试**

测试读取清单和生成目录，断言：

- 清单恰好有 100 条。
- 8 个分类均至少有 1 篇文章。
- 新路径、源路径和旧路径全局唯一。
- 标题非空，日期符合 `YYYY-MM-DD`，摘要非空。
- 每篇生成的 Markdown 文件存在。
- 生成内容不包含 `sidebar`、`sidebarDepth`、OAuth Secret 或 VuePress 插件配置。

- [ ] **步骤 2：运行测试并确认因迁移产物缺失而失败**

运行：

```bash
pnpm vitest run tests/unit/migrated-content.spec.ts
```

预期：FAIL，提示 `content/migration-manifest.json` 不存在。

- [ ] **步骤 3：实现迁移命令**

命令接口固定为：

```bash
node scripts/migrate-legacy-content.mjs \
  --source /Users/april/Downloads/april/blog \
  --output content/articles
```

迁移器必须：

- 只读取 `docs` 下 8 个已知正文目录。
- 排除所有 `README.md` 和 `.vuepress` 文件。
- 从旧 Git 历史补齐日期。
- 从 Markdown 标题或明确的标题覆盖表补齐标题。
- 复制实际存在的本地资源并重写路径。
- 生成迁移清单和重定向映射。
- 在写入前验证所有记录；提交阶段的可捕获错误必须回滚到旧快照。
- 记录每篇源文件的 SHA-256，以及 `markdown-heading`、`git-first-commit`
  两种实际使用的补齐来源。
- 拒绝项目外输出路径、符号链接源文件和越出旧 `docs` 的本地资源。

- [ ] **步骤 4：运行迁移命令**

运行：

```bash
pnpm migrate:content
```

预期：输出 `Migrated 100 articles`，进程退出码为 0。

- [ ] **步骤 5：实现独立校验命令**

校验器读取生成结果，检查数量、schema、唯一性、站内链接和本地资源，成功时输出：

```text
Verified 100 migrated articles
```

- [ ] **步骤 6：配置 Nuxt Content 集合**

`content.config.ts` 中的 `articles` 集合使用：

```ts
source: {
  include: 'articles/**/*.md',
  prefix: '/articles',
}
```

schema 增加 `date`、`category`、`categoryLabel`、`tags`、`legacyPaths` 和 `draft`，并为 `date`、`category` 建立索引。

- [ ] **步骤 7：运行迁移完整性测试与校验器**

运行：

```bash
pnpm verify:content
pnpm vitest run tests/unit/migrated-content.spec.ts
pnpm typecheck
```

预期：全部 PASS，且验证 100 篇文章。

- [ ] **步骤 8：提交任务**

```bash
git add package.json content.config.ts scripts content/articles content/migration-manifest.json server/data/legacy-redirects.json tests/unit/migrated-content.spec.ts .gitignore
git commit -m "feat(内容): 迁移全部旧博客文章"
```

## 任务 3：用 TDD 实现文章筛选与列表组件

**文件：**

- 创建：`tests/unit/useArticleFilters.spec.ts`
- 创建：`tests/nuxt/ArticleFilters.spec.ts`
- 创建：`tests/nuxt/ArticleList.spec.ts`
- 创建：`app/composables/useArticleFilters.ts`
- 创建：`app/components/articles/ArticleFilters.vue`
- 创建：`app/components/articles/ArticleList.vue`

- [ ] **步骤 1：编写筛选逻辑失败测试**

覆盖：

- 默认返回全部文章并按日期倒序。
- 分类和标签同时存在时使用交集。
- 未知分类返回空数组。
- 提取标签时去重并按字母与中文本地规则排序。
- 重置筛选恢复全部结果。

- [ ] **步骤 2：运行单元测试并确认因组合式函数缺失而失败**

运行：

```bash
pnpm vitest run tests/unit/useArticleFilters.spec.ts
```

预期：FAIL，提示无法导入 `useArticleFilters`。

- [ ] **步骤 3：实现最小筛选组合式函数**

固定接口：

```ts
export function useArticleFilters(articles: MaybeRefOrGetter<ArticleSummary[]>) {
  return {
    selectedCategory,
    selectedTag,
    availableTags,
    filteredArticles,
    setCategory,
    setTag,
    resetFilters,
  }
}
```

- [ ] **步骤 4：运行筛选测试并确认通过**

运行：

```bash
pnpm vitest run tests/unit/useArticleFilters.spec.ts
```

预期：PASS。

- [ ] **步骤 5：编写组件失败测试**

`ArticleFilters` 测试分类按钮、标签选择、选中状态与重置事件；`ArticleList` 测试文章元数据、可访问链接和空状态。

- [ ] **步骤 6：运行组件测试并确认因组件缺失而失败**

运行：

```bash
pnpm vitest run tests/nuxt/ArticleFilters.spec.ts tests/nuxt/ArticleList.spec.ts
```

预期：FAIL，提示组件不存在。

- [ ] **步骤 7：实现列表组件**

组件只使用 Props 和事件通信。文章链接使用 `NuxtLink`，日期使用 `<time datetime>`，筛选按钮使用 `aria-pressed`。

- [ ] **步骤 8：运行任务测试**

运行：

```bash
pnpm vitest run tests/unit/useArticleFilters.spec.ts tests/nuxt/ArticleFilters.spec.ts tests/nuxt/ArticleList.spec.ts
```

预期：PASS。

- [ ] **步骤 9：提交任务**

```bash
git add app/composables/useArticleFilters.ts app/components/articles app/types/article.ts tests/unit/useArticleFilters.spec.ts tests/nuxt/ArticleFilters.spec.ts tests/nuxt/ArticleList.spec.ts
git commit -m "feat(文章): 添加分类筛选与文章列表"
```

## 任务 4：实现文章列表页

**文件：**

- 创建：`tests/nuxt/articles-index-page.spec.ts`
- 创建：`app/pages/articles/index.vue`
- 修改：`app/components/AppHeader.vue`
- 修改：`app/assets/css/main.css`

- [ ] **步骤 1：编写列表页失败测试**

断言：

- 页面查询非草稿文章并按日期倒序。
- 页面显示文章总数、分类筛选和文章列表。
- `category` 与 `tag` 查询参数初始化筛选状态。
- 筛选变化更新 URL 查询参数但不重新加载页面。
- 配置标题、描述和 Canonical。
- 顶部导航的「文章」使用站内 Nuxt 路由。

- [ ] **步骤 2：运行页面测试并确认因页面缺失而失败**

运行：

```bash
pnpm vitest run tests/nuxt/articles-index-page.spec.ts
```

预期：FAIL，提示找不到 `/articles` 页面。

- [ ] **步骤 3：实现列表页面**

使用：

```ts
queryCollection('articles')
  .where('draft', '=', false)
  .order('date', 'DESC')
  .select('path', 'title', 'description', 'date', 'category', 'categoryLabel', 'tags')
  .all()
```

使用 `useSeoMeta` 和 `useHead` 配置 SEO，不在客户端重复请求文章内容。

- [ ] **步骤 4：添加文章列表样式**

延续首页设计令牌，增加 `.articles-page`、`.article-filters`、`.article-list` 和 `.article-card`。移动端不得产生横向滚动。

- [ ] **步骤 5：运行列表页与导航测试**

运行：

```bash
pnpm vitest run tests/nuxt/articles-index-page.spec.ts tests/nuxt/AppHeader.spec.ts
```

预期：PASS。

- [ ] **步骤 6：提交任务**

```bash
git add app/pages/articles/index.vue app/components/AppHeader.vue app/assets/css/main.css tests/nuxt/articles-index-page.spec.ts tests/nuxt/AppHeader.spec.ts
git commit -m "feat(文章): 实现文章列表页面"
```

## 任务 5：实现文章详情页和目录

**文件：**

- 创建：`tests/nuxt/ArticleToc.spec.ts`
- 创建：`tests/nuxt/article-detail-page.spec.ts`
- 创建：`app/components/articles/ArticleToc.vue`
- 创建：`app/pages/articles/[category]/[id].vue`
- 修改：`app/assets/css/main.css`

- [ ] **步骤 1：编写目录组件失败测试**

测试嵌套标题、空目录、锚点链接和可访问导航名称。

- [ ] **步骤 2：运行目录测试并确认因组件缺失而失败**

运行：

```bash
pnpm vitest run tests/nuxt/ArticleToc.spec.ts
```

预期：FAIL，提示组件不存在。

- [ ] **步骤 3：实现最小目录组件**

组件接收 Nuxt Content `body.toc.links`，递归渲染最多 3 层，不修改正文 AST。

- [ ] **步骤 4：编写详情页失败测试**

覆盖：

- 按完整路径查询文章。
- 渲染标题、日期、分类、标签和 `ContentRenderer`。
- 配置 Canonical、Open Graph 和 `BlogPosting` JSON-LD。
- 查询相邻文章并生成上一篇/下一篇链接。
- 无匹配内容时创建 `statusCode: 404` 的 Nuxt 错误。

- [ ] **步骤 5：运行详情页测试并确认因页面缺失而失败**

运行：

```bash
pnpm vitest run tests/nuxt/article-detail-page.spec.ts
```

预期：FAIL，提示详情页面不存在。

- [ ] **步骤 6：实现详情页**

查询当前文章：

```ts
queryCollection('articles')
  .path(route.path)
  .first()
```

相邻文章使用同一日期排序规则查询摘要字段，避免将全部正文发送到客户端。

- [ ] **步骤 7：添加阅读样式**

正文宽度、标题层级、代码块、表格、图片、引用和目录使用独立的 `.article-prose` 作用域，不能影响聊天 Markdown。

- [ ] **步骤 8：运行详情相关测试**

运行：

```bash
pnpm vitest run tests/nuxt/ArticleToc.spec.ts tests/nuxt/article-detail-page.spec.ts
```

预期：PASS。

- [ ] **步骤 9：提交任务**

```bash
git add app/components/articles/ArticleToc.vue app/pages/articles/[category]/[id].vue app/assets/css/main.css tests/nuxt/ArticleToc.spec.ts tests/nuxt/article-detail-page.spec.ts
git commit -m "feat(文章): 实现文章详情阅读页"
```

## 任务 6：实现旧地址 301 重定向

**文件：**

- 创建：`tests/unit/legacy-redirect.spec.ts`
- 创建：`tests/nuxt/legacy-redirects.spec.ts`
- 创建：`server/utils/legacy-redirect.ts`
- 创建：`server/middleware/legacy-redirects.ts`
- 修改：`nuxt.config.ts`

- [ ] **步骤 1：编写路径解析失败测试**

覆盖带 `.html`、不带扩展名、尾部斜杠、URL 编码、未知路径和查询参数。

- [ ] **步骤 2：运行单元测试并确认因解析器缺失而失败**

运行：

```bash
pnpm vitest run tests/unit/legacy-redirect.spec.ts
```

预期：FAIL，提示无法导入 `findLegacyRedirect`。

- [ ] **步骤 3：实现纯重定向查找函数**

```ts
export function normalizeLegacyPath(path: string): string
export function findLegacyRedirect(path: string): string | null
```

函数从生成的 JSON 映射读取目标，不使用模糊标题匹配。

- [ ] **步骤 4：编写 HTTP 301 失败测试**

测试真实请求的状态码为 301，`Location` 指向正确的新路径；未知 URL 不被中间件拦截。

- [ ] **步骤 5：运行集成测试并确认失败**

运行：

```bash
pnpm vitest run tests/nuxt/legacy-redirects.spec.ts
```

预期：FAIL，旧路径返回 404。

- [ ] **步骤 6：实现服务器中间件和固定目录重定向**

中间件仅处理清单中的文章旧路径。`nuxt.config.ts` 的 `routeRules` 处理 `/chat`、`/accumulate/`、`/categories/`、`/tag/` 和临时 `/timeline/`。

- [ ] **步骤 7：运行重定向测试**

运行：

```bash
pnpm vitest run tests/unit/legacy-redirect.spec.ts tests/nuxt/legacy-redirects.spec.ts
```

预期：PASS。

- [ ] **步骤 8：提交任务**

```bash
git add server/utils/legacy-redirect.ts server/middleware/legacy-redirects.ts nuxt.config.ts tests/unit/legacy-redirect.spec.ts tests/nuxt/legacy-redirects.spec.ts
git commit -m "feat(迁移): 添加旧文章永久重定向"
```

## 任务 7：整体验证和浏览器验收

**文件：**

- 修改：`README.md`
- 修改：迁移或页面实现中发现问题的相关文件

- [ ] **步骤 1：运行内容校验**

```bash
pnpm verify:content
```

预期：输出 `Verified 100 migrated articles`。

- [ ] **步骤 2：运行全量测试**

```bash
pnpm test
```

预期：全部测试通过，无未处理异常。

- [ ] **步骤 3：运行类型检查和生产构建**

```bash
pnpm typecheck
pnpm build
```

预期：退出码均为 0。

- [ ] **步骤 4：启动开发服务器**

```bash
pnpm dev --host 127.0.0.1 --port 4173
```

预期：访问 `/articles` 返回 200。

- [ ] **步骤 5：执行浏览器验收**

检查桌面端与 390 px 移动端：

- 文章列表、8 个分类和标签筛选。
- 技术文章与生活随笔各至少 2 篇。
- 代码块、表格、远程图片和本地图片。
- 文章目录、上一篇和下一篇。
- 页面无横向溢出、控制台错误或水合错误。

- [ ] **步骤 6：验证真实 301**

```bash
curl -I http://127.0.0.1:4173/accumulate/vue/21.html
curl -I http://127.0.0.1:4173/others/13.html
```

预期：状态码为 301，`Location` 分别为 `/articles/vue/21` 和 `/articles/life/13`。

- [ ] **步骤 7：记录运行和迁移说明**

README 说明：

- Node.js 与 pnpm 运行方式。
- `pnpm migrate:content` 和 `pnpm verify:content`。
- 内容源目录参数。
- 不得迁移旧 OAuth Secret。

- [ ] **步骤 8：最终提交**

```bash
git add README.md
git commit -m "docs(迁移): 补充内容迁移与验证说明"
```
