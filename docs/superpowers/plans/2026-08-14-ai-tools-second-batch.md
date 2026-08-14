# AI 工具第二批内容实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 为 AI 工具页新增 Frontend Design、Web Design Guidelines、Playwright MCP 和 Sentry MCP 的完整详情内容，将列表扩充为 12 个工具。

**架构：** 继续使用 Nuxt Content 的 `aiTools` 集合，每个新工具对应一个 Markdown 页面。列表、筛选、计数和详情路由均从内容集合动态生成，因此实现只新增 4 个内容文件并扩大内容契约测试，不修改 Vue 组件。

**技术栈：** Nuxt 4、Nuxt Content 3、Markdown Front Matter、Vitest、TypeScript

---

## 文件结构

- 修改：`tests/unit/ai-tools-content.spec.ts`：把内容契约扩充到 12 个工具、6 Skills 和 6 MCP。
- 创建：`content/ai-tools/frontend-design.md`：Anthropic Frontend Design 的介绍、安装和使用说明。
- 创建：`content/ai-tools/web-design-guidelines.md`：Vercel Web Design Guidelines 的审查场景和安装说明。
- 创建：`content/ai-tools/playwright-mcp.md`：Microsoft Playwright MCP 的本地配置和安全边界。
- 创建：`content/ai-tools/sentry-mcp.md`：Sentry 远程 OAuth MCP、自托管进阶方案和权限说明。

### 任务 1：扩充 AI 工具内容契约

**文件：**

- 修改：`tests/unit/ai-tools-content.spec.ts`

- [ ] **步骤 1：编写失败的内容数量测试**

把 `expectedSlugs` 改为：

```ts
const expectedSlugs = [
  'chrome-devtools-mcp',
  'context7',
  'figma-mcp',
  'find-skills',
  'frontend-design',
  'github-mcp',
  'playwright-mcp',
  'sentry-mcp',
  'skill-creator',
  'superpowers',
  'taste-skill',
  'web-design-guidelines',
]
```

把首个测试改为：

```ts
it('包含 6 个 Skill 和 6 个 MCP，且排序值唯一', () => {
  const tools = readTools()

  expect(tools.map(tool => tool.slug).sort()).toEqual(expectedSlugs)
  expect(tools.filter(tool => readField(tool.frontMatter, 'type') === 'skill')).toHaveLength(6)
  expect(tools.filter(tool => readField(tool.frontMatter, 'type') === 'mcp')).toHaveLength(6)

  const orders = tools.map(tool => readField(tool.frontMatter, 'order'))
  expect(new Set(orders).size).toBe(12)
  expect(orders.every(order => Number.isInteger(order) && Number(order) > 0)).toBe(true)
})
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
pnpm vitest run tests/unit/ai-tools-content.spec.ts
```

预期：FAIL。实际 slug 仍只有 8 个，Skill 与 MCP 数量仍为 4，排序唯一值仍为 8。

### 任务 2：新增两个前端设计 Skills

**文件：**

- 创建：`content/ai-tools/frontend-design.md`
- 创建：`content/ai-tools/web-design-guidelines.md`

- [ ] **步骤 1：创建 Frontend Design 内容页**

创建 `content/ai-tools/frontend-design.md`：

```markdown
---
title: "Frontend Design"
description: "帮助 AI 在编码前确定视觉方向，并生成有辨识度、可投入生产的前端界面。"
type: "skill"
order: 9
platforms: ["Codex", "Claude Code", "Cursor"]
tags: ["前端设计", "视觉方向", "UI"]
officialUrl: "https://www.skills.sh/anthropics/skills/frontend-design"
repositoryUrl: "https://github.com/anthropics/skills"
featured: false
draft: false
---

## 工具是什么

Frontend Design 是 Anthropic 提供的前端设计 Skill。它要求代理先理解页面目的、受众和技术约束，再选择明确的视觉方向，并把字体、色彩、布局、动效和细节落实为可以运行的界面代码。

它重点减少缺少语境的通用 Hero、模板化卡片和重复的 AI 视觉风格，让设计选择服务于具体产品，而不是只做表面装饰。

## 适合哪些场景

- 从零构建落地页、仪表盘、作品集或 Web 应用。
- 现有功能完整，但界面缺少鲜明的视觉方向。
- 需要在编码前确定字体、色彩、空间和标志性元素。
- 希望生成的页面兼顾响应式、键盘操作和减少动效设置。

## 安装方式

通过 Skills CLI 安装指定 Skill：

```bash
npx skills add anthropics/skills --skill frontend-design
```

安装前应查看仓库中的 `SKILL.md` 和许可说明，确认内容适合当前项目与客户端。

## 配置示例

Skill 不需要额外运行时服务。安装完成后，在设计任务中明确调用，并提供产品语境和现有约束：

```text
$frontend-design 为独立开发者的错误监控产品设计首页。保留现有组件库和品牌蓝色，先说明视觉方向，再实现响应式页面。
```

## 使用示例

```text
重新设计这个项目的工具详情页。不要改动数据结构，复用现有 CSS 变量，并让排版、留白和交互层级更有辨识度。
```

## 注意事项

- Skill 提供的是设计指导，不能替代用户研究、品牌规范和真实可用性测试。
- 对已有设计系统，应明确要求复用组件、字体和设计 Token。
- 有辨识度不等于堆叠装饰，视觉复杂度应与产品目标匹配。
- 安装第三方 Skill 前检查指令、脚本和许可，不要盲目信任自动执行内容。

## 官方链接

- [Frontend Design 详情](https://www.skills.sh/anthropics/skills/frontend-design)
- [Anthropic Skills 官方仓库](https://github.com/anthropics/skills)
- [Frontend Design SKILL.md](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md)
```

- [ ] **步骤 2：创建 Web Design Guidelines 内容页**

创建 `content/ai-tools/web-design-guidelines.md`：

```markdown
---
title: "Web Design Guidelines"
description: "按可访问性、交互、排版、动效和性能规则审查已有 Web 界面。"
type: "skill"
order: 10
platforms: ["Codex", "Claude Code", "Cursor"]
tags: ["可访问性", "交互检查", "Web 规范"]
officialUrl: "https://www.skills.sh/vercel-labs/agent-skills/web-design-guidelines"
repositoryUrl: "https://github.com/vercel-labs/agent-skills"
featured: false
draft: false
---

## 工具是什么

Web Design Guidelines 是 Vercel Agent Skills 中的界面审查 Skill。它根据 Web Interface Guidelines 检查可访问性、焦点状态、表单、动效、排版、图片、导航状态和性能等问题。

它更适合在已有页面上发现具体问题并提出修正建议，与负责形成新视觉方向的 Frontend Design 定位不同。

## 适合哪些场景

- 发布前审查页面的键盘操作、语义结构和焦点状态。
- 检查表单标签、自动填充、错误提示和提交反馈。
- 发现不尊重减少动效、触摸尺寸或深色模式的实现。
- 对 AI 生成的界面进行一次系统化质量检查。

## 安装方式

通过 Skills CLI 安装指定 Skill：

```bash
npx skills add vercel-labs/agent-skills --skill web-design-guidelines
```

## 配置示例

安装后可以把审查范围、目标文件和输出格式写入请求：

```text
$web-design-guidelines 审查 app/pages/ai-tools 和相关组件，按严重程度列出问题，并为每项提供文件位置和修复建议。
```

## 使用示例

```text
检查这个表单的键盘操作、可访问名称、错误反馈、移动端输入字号和减少动效支持。只报告可以从代码中验证的问题。
```

## 注意事项

- 自动审查不能替代屏幕阅读器、真实键盘和多设备测试。
- 部分规则包含 Vercel 的产品偏好，不一定适合所有品牌和技术栈。
- 修改前应区分通用 Web 问题与项目有意采用的设计约束。
- 审查结论需要结合浏览器行为、用户数据和项目质量门禁验证。

## 官方链接

- [Web Design Guidelines 详情](https://www.skills.sh/vercel-labs/agent-skills/web-design-guidelines)
- [Vercel Agent Skills 官方仓库](https://github.com/vercel-labs/agent-skills)
- [Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines)
```

### 任务 3：新增 Playwright 与 Sentry MCP

**文件：**

- 创建：`content/ai-tools/playwright-mcp.md`
- 创建：`content/ai-tools/sentry-mcp.md`

- [ ] **步骤 1：创建 Playwright MCP 内容页**

创建 `content/ai-tools/playwright-mcp.md`：

```markdown
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
```

- [ ] **步骤 2：创建 Sentry MCP 内容页**

创建 `content/ai-tools/sentry-mcp.md`：

```markdown
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
```

### 任务 4：验证列表、详情与内容质量

**文件：**

- 测试：`tests/unit/ai-tools-content.spec.ts`
- 验证：`content/ai-tools/frontend-design.md`
- 验证：`content/ai-tools/web-design-guidelines.md`
- 验证：`content/ai-tools/playwright-mcp.md`
- 验证：`content/ai-tools/sentry-mcp.md`

- [ ] **步骤 1：运行内容契约测试验证通过**

运行：

```bash
pnpm vitest run tests/unit/ai-tools-content.spec.ts
```

预期：PASS，2 个内容测试全部通过。

- [ ] **步骤 2：运行完整测试**

运行：

```bash
pnpm test
```

预期：30 个测试文件、262 个测试全部通过。

- [ ] **步骤 3：运行类型检查与生产构建**

运行：

```bash
pnpm typecheck
pnpm build
```

预期：两个命令退出码均为 0，Nuxt Content 成功处理 12 个 AI 工具文件。

- [ ] **步骤 4：浏览器验收**

启动本地开发服务器并检查：

- `/ai-tools` 显示 12 个工具、6 Skills、6 MCP。
- Skill 筛选显示 6 张卡片，MCP 筛选显示 6 张卡片。
- 4 个新标题都能进入对应详情页。
- 详情页包含安装、配置、使用、注意事项和官方链接。
- 浏览器控制台没有新增错误。

- [ ] **步骤 5：检查范围并提交**

```bash
git diff --check
git add tests/unit/ai-tools-content.spec.ts content/ai-tools/frontend-design.md content/ai-tools/web-design-guidelines.md content/ai-tools/playwright-mcp.md content/ai-tools/sentry-mcp.md
git commit -m "feat(AI 工具): 补充第二批工具内容"
```
