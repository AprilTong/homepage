import { mountSuspended } from '@nuxt/test-utils/runtime'
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

    const links = cards[0]!.findAll('a')
    expect(links).toHaveLength(1)
    expect(links[0]!.attributes('href')).toBe('/ai-tools/superpowers')
    expect(links[0]!.text()).toBe('查看详情')
  })

  it('空列表展示状态和重置入口', async () => {
    const wrapper = await mountList([])
    const empty = wrapper.get('[data-testid="ai-tool-empty-state"]')

    expect(empty.get('[role="status"]').text()).toBe('没有找到符合条件的 AI 工具。')
    await empty.get('button').trigger('click')
    expect(wrapper.emitted('reset')).toEqual([[]])
  })
})
