# AI 工具卡片标题链接实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 删除 AI 工具列表卡片底部的“查看详情”，将工具名称改为带亮蓝色悬停状态的唯一详情链接。

**架构：** 保持 `AiToolCard` 的单链接约束，只把现有 `NuxtLink` 从卡片底部移动到 `h2` 内。样式改为标题链接默认继承标题颜色，在支持悬停的设备上切换到现有亮蓝色变量；详情页紧凑卡片不变。

**技术栈：** Nuxt 4、Vue 3、Vue Router、Vitest、Nuxt Test Utils、CSS

---

## 文件结构

- 修改：`tests/nuxt/AiToolList.spec.ts`：约束标题链接结构、文本和悬停样式。
- 修改：`app/components/ai-tools/AiToolCard.vue`：把唯一详情链接移动到工具标题中。
- 修改：`app/assets/css/main.css`：删除列表卡片底部链接样式，增加标题链接默认和悬停状态。

### 任务 1：调整列表卡片详情入口

**文件：**

- 测试：`tests/nuxt/AiToolList.spec.ts`
- 修改：`app/components/ai-tools/AiToolCard.vue`
- 修改：`app/assets/css/main.css`

- [ ] **步骤 1：编写失败的组件与样式测试**

将卡片断言改为：

```ts
const titleLink = cards[0]!.get('h2 a')
expect(cards[0]!.findAll('a')).toHaveLength(1)
expect(titleLink.attributes('href')).toBe('/ai-tools/superpowers')
expect(titleLink.text()).toBe('Superpowers')
expect(cards[0]!.text()).not.toContain('查看详情')
expect(cards[0]!.find('.ai-tool-card__link').exists()).toBe(false)
```

在响应式样式测试中增加：

```ts
expect(stylesheet).toMatch(
  /@media \(hover: hover\)[\s\S]*?\.ai-tool-card h2 a:hover\s*\{[^}]*color:\s*var\(--color-cyan-bright\)/,
)
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
pnpm vitest run tests/nuxt/AiToolList.spec.ts
```

预期：FAIL，当前链接文本仍为“查看详情”，且 `h2` 内没有链接。

- [ ] **步骤 3：实现最少模板和样式变更**

标题模板改为：

```vue
<h2>
  <NuxtLink :to="tool.path">{{ tool.title }}</NuxtLink>
</h2>
```

删除卡片底部 `.ai-tool-card__link` 模板；为标题链接增加：

```css
.ai-tool-card h2 a {
  color: inherit;
  text-decoration: none;
  transition: color 180ms ease;
}

@media (hover: hover) {
  .ai-tool-card h2 a:hover {
    color: var(--color-cyan-bright);
  }
}
```

保留 `.ai-tool-card--compact a` 的详情链接样式和箭头，不修改详情页相关推荐。

- [ ] **步骤 4：运行定向测试验证通过**

运行：

```bash
pnpm vitest run tests/nuxt/AiToolList.spec.ts
```

预期：PASS，4 项列表组件测试全部通过。

- [ ] **步骤 5：运行完整验证**

运行：

```bash
pnpm test
pnpm typecheck
pnpm build
```

预期：测试、类型检查和生产构建全部退出码为 0。

- [ ] **步骤 6：检查范围并提交**

```bash
git diff --check
git add tests/nuxt/AiToolList.spec.ts app/components/ai-tools/AiToolCard.vue app/assets/css/main.css
git commit -m "feat(AI 工具): 使用标题进入工具详情"
```
