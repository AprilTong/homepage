# AI 工具页实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在博客中新增可筛选的 AI 工具列表、8 个内容驱动的工具详情页，以及可复制的安装和配置代码块。

**架构：** 使用独立的 Nuxt Content `aiTools` 集合保存工具元数据和 Markdown 正文；列表页只查询轻量字段，详情页按路径查询正文。Vue 展示组件与筛选组合式函数保持独立，代码块通过 Nuxt Content 的 `ProsePre` 覆盖组件统一增强复制能力。

**技术栈：** Nuxt 4、Vue 3、Nuxt Content 3、TypeScript、Vitest、Nuxt Test Utils、CSS

---

## 文件结构

### 新建

- `app/types/ai-tool.ts`：AI 工具摘要、类型和筛选类型。
- `app/composables/useAiToolFilters.ts`：按类型过滤工具。
- `app/components/ai-tools/AiToolHero.vue`：列表页标题和数量摘要。
- `app/components/ai-tools/AiToolFilters.vue`：全部、Skills、MCP 筛选按钮。
- `app/components/ai-tools/AiToolCard.vue`：单个工具摘要卡片。
- `app/components/ai-tools/AiToolList.vue`：响应式卡片列表与空状态。
- `app/components/ai-tools/AiToolSidebar.vue`：详情页外部链接和目录。
- `app/components/content/ProsePre.vue`：代码块和复制交互。
- `app/pages/ai-tools/index.vue`：内容查询、URL 同步和列表页 SEO。
- `app/pages/ai-tools/[slug].vue`：详情查询、404、推荐和 SEO。
- `content/ai-tools/*.md`：8 个首发工具正文。
- `tests/unit/ai-tools-content.spec.ts`：内容完整性和安全性验证。
- `tests/unit/useAiToolFilters.spec.ts`：筛选逻辑测试。
- `tests/nuxt/AiToolFilters.spec.ts`：筛选组件测试。
- `tests/nuxt/AiToolList.spec.ts`：列表与卡片测试。
- `tests/nuxt/ai-tools-index-page.spec.ts`：列表页查询、路由和 SEO 测试。
- `tests/nuxt/ai-tool-detail-page.spec.ts`：详情、404、推荐和 SEO 测试。
- `tests/nuxt/ProsePre.spec.ts`：复制成功、失败和回退测试。

### 修改

- `content.config.ts`：注册 `aiTools` 集合和字段约束。
- `app/components/AppHeader.vue`：增加「AI 工具」入口和活动状态。
- `tests/nuxt/AppHeader.spec.ts`：覆盖新增入口与活动状态。
- `app/assets/css/main.css`：新增列表、详情和代码块样式。
- `README.md`：记录新增公开路由。

## 任务 1：建立内容模型与首发内容

**文件：**

- 创建：`app/types/ai-tool.ts`
- 创建：`tests/unit/ai-tools-content.spec.ts`
- 创建：`content/ai-tools/superpowers.md`
- 创建：`content/ai-tools/taste-skill.md`
- 创建：`content/ai-tools/find-skills.md`
- 创建：`content/ai-tools/skill-creator.md`
- 创建：`content/ai-tools/figma-mcp.md`
- 创建：`content/ai-tools/chrome-devtools-mcp.md`
- 创建：`content/ai-tools/context7.md`
- 创建：`content/ai-tools/github-mcp.md`
- 修改：`content.config.ts`

- [ ] **步骤 1：编写内容完整性失败测试**

测试读取 `content/ai-tools/*.md`，解析 Front Matter，并断言：文件名集合精确等于 8 个预期 Slug；`type` 为 `skill` 或 `mcp`；`order` 唯一；官方链接使用 HTTPS；正文包含「工具是什么」「适合哪些场景」「安装方式」「配置示例」「使用示例」「注意事项」「官方链接」7 个二级标题；正文不包含真实 Token、未完成标记或空代码块。

```ts
const expectedSlugs = [
  'chrome-devtools-mcp', 'context7', 'figma-mcp', 'find-skills',
  'github-mcp', 'skill-creator', 'superpowers', 'taste-skill',
]

expect(files.map(file => basename(file, '.md')).sort()).toEqual(expectedSlugs)
expect(new Set(items.map(item => item.order)).size).toBe(8)
expect(items.filter(item => item.type === 'skill')).toHaveLength(4)
expect(items.filter(item => item.type === 'mcp')).toHaveLength(4)
```

- [ ] **步骤 2：运行测试确认失败**

运行：`pnpm vitest run --project unit tests/unit/ai-tools-content.spec.ts`

预期：FAIL，提示 `content/ai-tools` 不存在或文件集合为空。

- [ ] **步骤 3：添加 TypeScript 类型和 Content 集合**

```ts
export type AiToolType = 'skill' | 'mcp'
export type AiToolFilter = AiToolType | null

export interface AiToolSummary {
  path: string
  title: string
  description: string
  type: AiToolType
  order: number
  platforms: string[]
  tags: string[]
  officialUrl: string
  repositoryUrl?: string
  featured: boolean
}
```

在 `content.config.ts` 增加 `aiTools`，字段使用 `z.enum(['skill', 'mcp'])`、`z.number().int().positive()`、`z.string().url()` 和布尔默认值约束，并为 `type`、`order` 建索引。

- [ ] **步骤 4：写入 8 篇完整中文内容**

每篇正文使用一致章节，但命令按官方来源区分。至少包含 Codex 安装示例；不能确认的平台不写推测命令。MCP 权限提醒必须指出浏览器、设计文件或仓库数据可能被读取；Skills 提醒安装前审查 `SKILL.md` 和附带脚本。

- [ ] **步骤 5：运行内容测试和类型检查**

运行：`pnpm vitest run --project unit tests/unit/ai-tools-content.spec.ts && pnpm typecheck`

预期：PASS，8 篇内容全部满足结构要求，Content 类型生成成功。

- [ ] **步骤 6：Commit**

```bash
git add content.config.ts app/types/ai-tool.ts content/ai-tools tests/unit/ai-tools-content.spec.ts
git commit -m "feat(AI 工具): 添加首发工具内容模型"
```

## 任务 2：增加顶部导航入口

**文件：**

- 修改：`tests/nuxt/AppHeader.spec.ts`
- 修改：`app/components/AppHeader.vue`

- [ ] **步骤 1：编写失败测试**

在导航入口断言中加入 `['/ai-tools', 'AI 工具']`；增加 `/ai-tools` 和 `/ai-tools/context7` 两个路由的活动状态测试，并断言其他导航没有 `aria-current="page"`。

- [ ] **步骤 2：运行测试确认失败**

运行：`pnpm vitest run --project nuxt tests/nuxt/AppHeader.spec.ts`

预期：FAIL，找不到 `/ai-tools` 链接。

- [ ] **步骤 3：实现最少导航变更**

```ts
const isAiToolsRoute = computed(() => route.path === '/ai-tools' || route.path.startsWith('/ai-tools/'))
```

在「文章」与「关于」之间加入站内 `NuxtLink`，沿用关闭移动菜单的行为。

- [ ] **步骤 4：运行测试确认通过**

运行：`pnpm vitest run --project nuxt tests/nuxt/AppHeader.spec.ts`

预期：PASS。

- [ ] **步骤 5：Commit**

```bash
git add app/components/AppHeader.vue tests/nuxt/AppHeader.spec.ts
git commit -m "feat(导航): 添加 AI 工具入口"
```

## 任务 3：实现筛选逻辑和列表组件

**文件：**

- 创建：`tests/unit/useAiToolFilters.spec.ts`
- 创建：`tests/nuxt/AiToolFilters.spec.ts`
- 创建：`tests/nuxt/AiToolList.spec.ts`
- 创建：`app/composables/useAiToolFilters.ts`
- 创建：`app/components/ai-tools/AiToolFilters.vue`
- 创建：`app/components/ai-tools/AiToolCard.vue`
- 创建：`app/components/ai-tools/AiToolList.vue`
- 创建：`app/components/ai-tools/AiToolHero.vue`

- [ ] **步骤 1：编写筛选组合式函数失败测试**

断言默认返回全部、设置 `skill` 或 `mcp` 后正确过滤、非法值回退到 `null`、原始数组不被修改。

```ts
const { selectedType, filteredTools, setType } = useAiToolFilters(ref(tools))
setType('skill')
expect(selectedType.value).toBe('skill')
expect(filteredTools.value.map(tool => tool.type)).toEqual(['skill', 'skill'])
```

- [ ] **步骤 2：运行组合式函数测试确认失败**

运行：`pnpm vitest run --project unit tests/unit/useAiToolFilters.spec.ts`

预期：FAIL，模块不存在。

- [ ] **步骤 3：实现筛选组合式函数**

实现 `setType(value: unknown)`，只接受 `skill`、`mcp` 或 `null`；使用 `computed` 生成筛选结果。

- [ ] **步骤 4：编写组件失败测试**

`AiToolFilters` 测试按钮文本、`aria-pressed`、事件参数；`AiToolList` 测试卡片字段、单一详情链接、空状态和「查看全部」事件；`AiToolHero` 测试总数与分类数量。

- [ ] **步骤 5：运行组件测试确认失败**

运行：`pnpm vitest run --project nuxt tests/nuxt/AiToolFilters.spec.ts tests/nuxt/AiToolList.spec.ts`

预期：FAIL，组件不存在。

- [ ] **步骤 6：实现展示组件**

筛选按钮使用 `data-type=""`、`data-type="skill"`、`data-type="mcp"`；卡片外层为 `article.ai-tool-card`；平台和标签均限制展示数量，完整信息留在详情页；空状态按钮发出 `reset`。

- [ ] **步骤 7：运行相关测试确认通过**

运行：`pnpm vitest run --project unit tests/unit/useAiToolFilters.spec.ts && pnpm vitest run --project nuxt tests/nuxt/AiToolFilters.spec.ts tests/nuxt/AiToolList.spec.ts`

预期：PASS。

- [ ] **步骤 8：Commit**

```bash
git add app/types/ai-tool.ts app/composables/useAiToolFilters.ts app/components/ai-tools tests/unit/useAiToolFilters.spec.ts tests/nuxt/AiToolFilters.spec.ts tests/nuxt/AiToolList.spec.ts
git commit -m "feat(AI 工具): 添加工具筛选和列表组件"
```

## 任务 4：实现列表页与 URL 同步

**文件：**

- 创建：`tests/nuxt/ai-tools-index-page.spec.ts`
- 创建：`app/pages/ai-tools/index.vue`

- [ ] **步骤 1：编写失败测试**

Mock `queryCollection('aiTools')` 链式调用，断言只查询非草稿字段并按 `order ASC`、`title ASC` 排序。覆盖默认列表、`?type=skill`、切换筛选、浏览器前进后退、非法或数组参数归一化、保留无关查询参数和固定 Canonical URL。

- [ ] **步骤 2：运行测试确认失败**

运行：`pnpm vitest run --project nuxt tests/nuxt/ai-tools-index-page.spec.ts`

预期：FAIL，页面模块不存在。

- [ ] **步骤 3：实现内容查询和路由同步**

查询字段固定为：

```ts
.select('path', 'title', 'description', 'type', 'order', 'platforms',
  'tags', 'officialUrl', 'repositoryUrl', 'featured')
```

URL 同步沿用文章列表页的 `pendingReplacement` 防重入方式，但只管理 `type` 参数，不删除其他查询参数。非法值和数组值归一化为无筛选状态。

- [ ] **步骤 4：添加列表页 SEO**

标题使用「AI 工具箱｜April 的技术笔记」，Canonical 固定为 `https://blog.april-tong.cn/ai-tools`，不携带筛选参数。

- [ ] **步骤 5：运行页面测试确认通过**

运行：`pnpm vitest run --project nuxt tests/nuxt/ai-tools-index-page.spec.ts`

预期：PASS。

- [ ] **步骤 6：Commit**

```bash
git add app/pages/ai-tools/index.vue tests/nuxt/ai-tools-index-page.spec.ts
git commit -m "feat(AI 工具): 添加工具列表页"
```

## 任务 5：实现代码块复制

**文件：**

- 创建：`tests/nuxt/ProsePre.spec.ts`
- 创建：`app/components/content/ProsePre.vue`

- [ ] **步骤 1：编写 Clipboard API 成功与失败测试**

Mock `navigator.clipboard.writeText`，断言复制的是原始 `code` 属性、成功文本变为「已复制」、计时后恢复；拒绝 Promise 时显示「复制失败」且代码仍存在。

- [ ] **步骤 2：编写兼容回退测试**

移除 `navigator.clipboard`，Mock `document.execCommand('copy')`，断言创建的临时 `textarea` 最终被移除；回退失败时不抛出未处理异常。

- [ ] **步骤 3：运行测试确认失败**

运行：`pnpm vitest run --project nuxt tests/nuxt/ProsePre.spec.ts`

预期：FAIL，组件不存在。

- [ ] **步骤 4：实现 `ProsePre`**

组件接收 `code`、`language`、`filename`、`highlights` 和 `meta`，保留默认插槽输出；复制函数只在点击时访问浏览器 API；使用 `onBeforeUnmount` 清理恢复计时器。

- [ ] **步骤 5：运行测试确认通过**

运行：`pnpm vitest run --project nuxt tests/nuxt/ProsePre.spec.ts`

预期：PASS。

- [ ] **步骤 6：Commit**

```bash
git add app/components/content/ProsePre.vue tests/nuxt/ProsePre.spec.ts
git commit -m "feat(内容): 添加代码块复制功能"
```

## 任务 6：实现工具详情页

**文件：**

- 创建：`tests/nuxt/ai-tool-detail-page.spec.ts`
- 创建：`app/components/ai-tools/AiToolSidebar.vue`
- 创建：`app/pages/ai-tools/[slug].vue`

- [ ] **步骤 1：编写详情查询和渲染失败测试**

Mock 当前工具查询和同类型推荐查询，断言按完整路径查询非草稿工具；渲染标题、类型、平台、标签、正文、官方链接、仓库链接、目录、返回入口和最多 3 个同类型推荐。

- [ ] **步骤 2：编写异常与 SEO 失败测试**

覆盖工具不存在返回 404、查询故障透传、Canonical 使用内容规范路径、`SoftwareApplication` JSON-LD 可安全解析且标题中的 `</script>` 被转义。

- [ ] **步骤 3：运行测试确认失败**

运行：`pnpm vitest run --project nuxt tests/nuxt/ai-tool-detail-page.spec.ts`

预期：FAIL，页面模块不存在。

- [ ] **步骤 4：实现详情页和侧栏**

当前工具不存在时调用：

```ts
throw createError({
  statusCode: 404,
  statusMessage: 'Not Found',
  message: 'AI 工具不存在',
})
```

相关推荐查询使用同一个 `aiTools` 集合，过滤 `draft = false` 和当前 `type`，排序后在内存中排除当前路径并截取 3 个。

- [ ] **步骤 5：运行详情测试确认通过**

运行：`pnpm vitest run --project nuxt tests/nuxt/ai-tool-detail-page.spec.ts`

预期：PASS。

- [ ] **步骤 6：Commit**

```bash
git add app/components/ai-tools/AiToolSidebar.vue app/pages/ai-tools/[slug].vue tests/nuxt/ai-tool-detail-page.spec.ts
git commit -m "feat(AI 工具): 添加工具详情页"
```

## 任务 7：完成视觉、文档和全量验证

**文件：**

- 修改：`app/assets/css/main.css`
- 修改：`README.md`

- [ ] **步骤 1：添加页面与组件样式**

复用现有颜色变量、面板阴影和圆角；新增 `.ai-tools-page`、`.ai-tools-hero`、`.ai-tool-filters`、`.ai-tool-list`、`.ai-tool-card`、`.ai-tool-detail-page`、`.ai-tool-reader`、`.ai-tool-sidebar` 和 `.prose-pre` 样式。断点使用现有 960 px 和 720 px；减少动态效果媒体查询关闭卡片位移。

- [ ] **步骤 2：更新 README 路由说明**

在常用路由中加入 `/ai-tools` 和 `/ai-tools/:slug`，说明页面用于浏览 Skills 与 MCP 的安装和配置示例。

- [ ] **步骤 3：运行定向测试**

运行：

```bash
pnpm vitest run --project unit tests/unit/ai-tools-content.spec.ts tests/unit/useAiToolFilters.spec.ts
pnpm vitest run --project nuxt tests/nuxt/AppHeader.spec.ts tests/nuxt/AiToolFilters.spec.ts tests/nuxt/AiToolList.spec.ts tests/nuxt/ai-tools-index-page.spec.ts tests/nuxt/ProsePre.spec.ts tests/nuxt/ai-tool-detail-page.spec.ts
```

预期：全部 PASS。

- [ ] **步骤 4：运行全量验证**

运行：

```bash
pnpm test
pnpm typecheck
pnpm build
```

预期：全部退出码为 0。

- [ ] **步骤 5：启动本地站点并做浏览器视觉检查**

检查 `/ai-tools`、`/ai-tools/superpowers` 和 `/ai-tools/figma-mcp` 的桌面端与移动端：导航活动状态、筛选、卡片列数、长命令横向滚动、复制反馈、侧栏折行和无横向溢出。发现问题后先补回归测试，再修复实现。

- [ ] **步骤 6：检查变更范围并 Commit**

```bash
git diff --check
git status --short
git add app/assets/css/main.css README.md
git commit -m "style(AI 工具): 完善响应式页面样式"
```
