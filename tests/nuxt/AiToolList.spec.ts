import { mountSuspended } from '@nuxt/test-utils/runtime'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, describe, expect, it } from 'vitest'

import AiToolHero from '~/components/ai-tools/AiToolHero.vue'
import AiToolList from '~/components/ai-tools/AiToolList.vue'
import type { AiToolSummary } from '~/types/ai-tool'

const tools: AiToolSummary[] = [
  {
    path: '/ai-tools/superpowers',
    title: 'Superpowers',
    description: '结构化工程工作流。',
    type: 'skill',
    order: 1,
    platforms: ['Codex', 'Claude Code', 'Cursor', 'Gemini'],
    tags: ['工程流程', 'TDD', '调试', '验证'],
    officialUrl: 'https://example.com/superpowers',
    featured: true,
  },
  {
    path: '/ai-tools/figma-mcp',
    title: 'Figma MCP',
    description: '读取设计上下文。',
    type: 'mcp',
    order: 2,
    platforms: ['Codex'],
    tags: ['Figma'],
    officialUrl: 'https://example.com/figma',
    featured: false,
  },
]
const wrappers = new Set<{ unmount: () => void }>()

afterEach(() => {
  for (const wrapper of wrappers)
    wrapper.unmount()
  wrappers.clear()
})

async function mountList(items: AiToolSummary[] = tools) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/ai-tools/:slug', component: { render: () => null } }],
  })
  const wrapper = await mountSuspended(AiToolList, {
    route: false,
    props: { tools: items },
    global: { plugins: [router] },
  })
  wrappers.add(wrapper)
  return wrapper
}

describe('AI 工具展示组件', () => {
  it('定义列表、详情和代码块的响应式布局', async () => {
    const stylesheet = await readFile(resolve(process.cwd(), 'app/assets/css/main.css'), 'utf8')

    expect(stylesheet).toMatch(
      /\.ai-tool-list\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/s,
    )
    expect(stylesheet).toMatch(
      /@media \(max-width: 960px\)[\s\S]*?\.ai-tool-list\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/,
    )
    expect(stylesheet).toMatch(
      /@media \(max-width: 720px\)[\s\S]*?\.ai-tool-list\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/,
    )
    expect(stylesheet).toMatch(
      /\.ai-tool-detail__layout\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) minmax\(210px, 260px\)/s,
    )
    expect(stylesheet).toMatch(/\.prose-pre pre\s*\{[^}]*overflow-x:\s*auto/s)
    expect(stylesheet).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.ai-tool-card\s*\{[^}]*transform:\s*none !important/,
    )
    expect(stylesheet).toMatch(
      /@media \(hover: hover\)[\s\S]*?\.ai-tool-card h2 a:hover\s*\{[^}]*color:\s*var\(--color-cyan-bright\)/,
    )
  })

  it('Hero 展示动态总数和类型数量', async () => {
    const wrapper = await mountSuspended(AiToolHero, {
      props: { total: 8, skillCount: 4, mcpCount: 4 },
    })
    wrappers.add(wrapper)

    expect(wrapper.get('h1').text()).toBe('常用 AI 工具')
    expect(wrapper.get('[data-testid="tool-counts"]').text()).toContain('8 个工具')
    expect(wrapper.get('[data-testid="tool-counts"]').text()).toContain('4 Skills')
    expect(wrapper.get('[data-testid="tool-counts"]').text()).toContain('4 MCP')
  })

  it('卡片展示类型、推荐标记、有限标签和唯一详情链接', async () => {
    const wrapper = await mountList()
    const cards = wrapper.get('ol.ai-tool-list').findAll('article.ai-tool-card')

    expect(cards).toHaveLength(2)
    expect(cards[0]!.get('[data-testid="tool-type"]').text()).toBe('Skill')
    expect(cards[0]!.get('[data-testid="tool-featured"]').text()).toBe('推荐')
    expect(cards[0]!.text()).toContain('结构化工程工作流。')
    expect(cards[0]!.findAll('[data-testid="tool-tag"]')).toHaveLength(3)
    expect(cards[0]!.get('[data-testid="tool-platforms"]').text()).toBe('Codex · Claude Code · Cursor')

    const titleLink = cards[0]!.get('h2 a')
    expect(cards[0]!.findAll('a')).toHaveLength(1)
    expect(titleLink.attributes('href')).toBe('/ai-tools/superpowers')
    expect(titleLink.text()).toBe('Superpowers')
    expect(cards[0]!.text()).not.toContain('查看详情')
    expect(cards[0]!.find('.ai-tool-card__link').exists()).toBe(false)
  })

  it('空列表展示状态和重置入口', async () => {
    const wrapper = await mountList([])
    const empty = wrapper.get('[data-testid="ai-tool-empty-state"]')

    expect(empty.get('[role="status"]').text()).toBe('没有找到符合条件的 AI 工具。')
    await empty.get('button').trigger('click')
    expect(wrapper.emitted('reset')).toEqual([[]])
  })
})
