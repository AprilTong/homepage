# AI 工具第二批内容扩充设计规格

## 背景

AI 工具页当前收录 4 个 Agent Skills 和 4 个 MCP，并为每个工具提供作用介绍、安装方式、配置示例、使用示例和注意事项。首批页面与详情交互已经稳定，可以继续补充第二批常用工具。

本次加入 Anthropic Frontend Design、Vercel Web Design Guidelines、Microsoft Playwright MCP 和 Sentry MCP。新增内容沿用现有页面与内容模型，不引入新的视觉分组或组件行为。

## 目标

- 新增 2 个 Skill 和 2 个 MCP 的完整详情页。
- 保持 AI 工具列表、筛选、动态计数和详情路由的现有实现不变。
- 为每个工具提供可复制的安装或连接配置、实际使用示例和安全说明。
- 以官方仓库或官方服务文档为信息来源，避免使用过期命令和非官方说明。
- 将工具总数扩充为 12，其中包含 6 个 Skills 和 6 个 MCP。

## 非目标

- 不新增“首批”或“第二批”视觉分组。
- 不修改卡片、筛选器、详情页布局或响应式样式。
- 不将新增工具标记为推荐。
- 不在页面中实时请求外部仓库、安装量或服务状态。
- 不为不同工具引入额外的专属详情组件。

## 内容架构

每个工具继续使用 `content/ai-tools/<slug>.md` 文件，并遵循现有 `aiTools` 内容集合的 Front Matter：

- `title`
- `description`
- `type`
- `order`
- `platforms`
- `tags`
- `officialUrl`
- `repositoryUrl`
- `featured`
- `draft`

正文统一包含以下 7 个二级标题：

1. 工具是什么
2. 适合哪些场景
3. 安装方式
4. 配置示例
5. 使用示例
6. 注意事项
7. 官方链接

## 新增工具

### Frontend Design

- 文件：`content/ai-tools/frontend-design.md`
- 类型：`skill`
- 排序：`9`
- 推荐：`false`
- 平台：Codex、Claude Code、Cursor
- 标签：前端设计、视觉方向、UI
- 官方页面：`https://www.skills.sh/anthropics/skills/frontend-design`
- 官方仓库：`https://github.com/anthropics/skills`

内容重点：

- 在编码前明确页面目标、受众和视觉方向。
- 通过字体、色彩、布局和标志性元素形成有辨识度的界面。
- 避免无关语境的模板化 Hero、通用字体和重复的 AI 设计风格。
- 使用 `npx skills add anthropics/skills --skill frontend-design` 安装。
- 对现有品牌或设计系统，明确要求复用组件和设计 Token。

### Web Design Guidelines

- 文件：`content/ai-tools/web-design-guidelines.md`
- 类型：`skill`
- 排序：`10`
- 推荐：`false`
- 平台：Codex、Claude Code、Cursor
- 标签：可访问性、交互检查、Web 规范
- 官方页面：`https://www.skills.sh/vercel-labs/agent-skills/web-design-guidelines`
- 官方仓库：`https://github.com/vercel-labs/agent-skills`

内容重点：

- 审查已有界面的交互、焦点、表单、动效、排版、图片和性能问题。
- 明确该 Skill 更适合审查与修正，而不是替代前期视觉概念设计。
- 使用 `npx skills add vercel-labs/agent-skills --skill web-design-guidelines` 安装。
- 审查结果应结合项目框架、品牌规范和真实设备验证。
- AI 审查不能替代人工可访问性测试和正式质量门禁。

### Playwright MCP

- 文件：`content/ai-tools/playwright-mcp.md`
- 类型：`mcp`
- 排序：`11`
- 推荐：`false`
- 平台：Codex、Claude Code、Cursor
- 标签：浏览器自动化、端到端测试、Playwright
- 官方页面：`https://github.com/microsoft/playwright-mcp`
- 官方仓库：`https://github.com/microsoft/playwright-mcp`

内容重点：

- 使用结构化可访问性快照执行页面导航、点击、输入和状态读取。
- 适合探索性自动化、长时间浏览器会话和需要持续页面上下文的代理任务。
- Codex 使用 `@playwright/mcp@latest` 的本地 MCP 配置。
- 区分 Playwright MCP 与可重复运行的 Playwright Test 测试套件。
- 不在包含私人账号或敏感数据的浏览器上下文中授权不受控操作。

### Sentry MCP

- 文件：`content/ai-tools/sentry-mcp.md`
- 类型：`mcp`
- 排序：`12`
- 推荐：`false`
- 平台：Codex、Claude Code、Cursor
- 标签：Sentry、错误排查、可观测性
- 官方页面：`https://mcp.sentry.dev/`
- 官方仓库：`https://github.com/getsentry/sentry-mcp`

内容重点：

- 查询错误、Issue、事件和性能数据，辅助定位生产环境问题。
- 优先介绍 `https://mcp.sentry.dev/mcp` 远程 OAuth 服务。
- 推荐把远程连接限制到具体组织和项目，减少无关工具与数据范围。
- 将自托管 Sentry、显式访问令牌和 stdio 方式说明为进阶用法。
- 示例只使用占位符，不写入真实 Token、组织名、项目名或第三方模型密钥。
- AI 搜索与自动修复建议需要人工确认，不能替代生产变更流程。

## 安全与错误处理

- 安装 Skills 前检查来源、`SKILL.md` 和附带脚本。
- 浏览器 MCP 的示例避免访问含敏感账号、支付信息或私人数据的页面。
- Sentry 配置遵循最小权限，并优先使用项目级 OAuth 作用域。
- 所有凭据都使用显式占位符，内容测试继续扫描常见密钥格式。
- 外部官方链接只作为静态链接保存；外部服务不可用时不影响列表和详情页渲染。
- 页面不承诺工具永久兼容所有客户端，平台差异以官方文档为准。

## 测试与验收

更新 `tests/unit/ai-tools-content.spec.ts`：

- `expectedSlugs` 增加 `frontend-design`、`web-design-guidelines`、`playwright-mcp` 和 `sentry-mcp`。
- 工具数量从 8 调整为 12。
- 类型数量从 4 Skills、4 MCP 调整为 6 Skills、6 MCP。
- 12 个 `order` 值必须唯一、为正整数。
- 所有新增内容必须通过现有元数据、章节、安全模式和空代码块检查。

页面层验收：

- AI 工具页自动显示 12 个工具、6 Skills、6 MCP。
- Skill 与 MCP 筛选继续根据内容数据工作。
- 4 个新标题链接可以进入各自详情页。
- 每个详情页可以渲染正文、官方链接和相关推荐。

验证命令：

```bash
pnpm vitest run tests/unit/ai-tools-content.spec.ts
pnpm test
pnpm typecheck
pnpm build
```

## 官方来源

- Anthropic Frontend Design：`https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md`
- Vercel Agent Skills：`https://github.com/vercel-labs/agent-skills`
- Vercel Web Interface Guidelines：`https://github.com/vercel-labs/web-interface-guidelines`
- Microsoft Playwright MCP：`https://github.com/microsoft/playwright-mcp`
- Sentry MCP 服务：`https://mcp.sentry.dev/`
- Sentry MCP 仓库：`https://github.com/getsentry/sentry-mcp`
