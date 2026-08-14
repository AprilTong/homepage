import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { Router } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import AiToolsIndexPage from '~/pages/ai-tools/index.vue'
import type { AiToolSummary } from '~/types/ai-tool'

const contentQuery = vi.hoisted(() => {
  const builder = {
    where: vi.fn(),
    order: vi.fn(),
    select: vi.fn(),
    all: vi.fn(),
  }
  const queryCollection = vi.fn(() => builder)
  builder.where.mockReturnValue(builder)
  builder.order.mockReturnValue(builder)
  builder.select.mockReturnValue(builder)
  return { builder, queryCollection }
})

mockNuxtImport('queryCollection', () => contentQuery.queryCollection)

const tools: AiToolSummary[] = [
  {
    path: '/ai-tools/superpowers',
    title: 'Superpowers',
    description: '工程流程',
    type: 'skill',
    order: 1,
    platforms: ['Codex'],
    tags: ['TDD'],
    officialUrl: 'https://example.com/superpowers',
    featured: true,
  },
  {
    path: '/ai-tools/taste-skill',
    title: 'Taste Skill',
    description: '设计规则',
    type: 'skill',
    order: 2,
    platforms: ['Codex'],
    tags: ['UI'],
    officialUrl: 'https://example.com/taste',
    featured: true,
  },
  {
    path: '/ai-tools/figma-mcp',
    title: 'Figma MCP',
    description: '设计上下文',
    type: 'mcp',
    order: 5,
    platforms: ['Codex'],
    tags: ['Figma'],
    officialUrl: 'https://example.com/figma',
    featured: true,
  },
  {
    path: '/ai-tools/context7',
    title: 'Context7',
    description: '开发文档',
    type: 'mcp',
    order: 7,
    platforms: ['Codex'],
    tags: ['文档'],
    officialUrl: 'https://example.com/context7',
    featured: false,
  },
]
const wrappers = new Set<{ unmount: () => void }>()

beforeEach(() => {
  contentQuery.queryCollection.mockClear()
  contentQuery.builder.where.mockClear()
  contentQuery.builder.order.mockClear()
  contentQuery.builder.select.mockClear()
  contentQuery.builder.all.mockReset().mockResolvedValue(tools)
})

afterEach(() => {
  for (const wrapper of wrappers)
    wrapper.unmount()
  wrappers.clear()
  vi.restoreAllMocks()
})

async function mountPage(path = '/ai-tools') {
  const wrapper = await mountSuspended(AiToolsIndexPage, { route: path })
  wrappers.add(wrapper)
  await flushPromises()
  const router = wrapper.vm.$router as Router
  const replace = vi.spyOn(router, 'replace')
  return { replace, router, wrapper }
}

describe('AI 工具列表页', () => {
  it('只查询一次已发布工具并渲染动态数量', async () => {
    const { wrapper } = await mountPage()

    expect(contentQuery.queryCollection).toHaveBeenCalledWith('aiTools')
    expect(contentQuery.builder.where).toHaveBeenCalledWith('draft', '=', false)
    expect(contentQuery.builder.order.mock.calls).toEqual([
      ['order', 'ASC'],
      ['title', 'ASC'],
    ])
    expect(contentQuery.builder.select).toHaveBeenCalledWith(
      'path', 'title', 'description', 'type', 'order', 'platforms',
      'tags', 'officialUrl', 'repositoryUrl', 'featured',
    )
    expect(contentQuery.builder.all).toHaveBeenCalledOnce()
    expect(wrapper.findAll('article.ai-tool-card')).toHaveLength(4)
    expect(wrapper.get('[data-testid="tool-counts"]').text()).toContain('4 个工具')
    expect(wrapper.get('[data-testid="tool-counts"]').text()).toContain('2 Skills')
    expect(wrapper.get('[data-testid="tool-counts"]').text()).toContain('2 MCP')
  })

  it('从查询参数初始化筛选并保留无关参数', async () => {
    const { replace, router, wrapper } = await mountPage('/ai-tools?type=skill&from=share')

    expect(wrapper.get('button[data-type="skill"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.findAll('article.ai-tool-card')).toHaveLength(2)
    expect(replace).not.toHaveBeenCalled()

    await wrapper.get('button[data-type="mcp"]').trigger('click')
    await vi.waitFor(() => {
      expect(router.currentRoute.value.query).toEqual({ type: 'mcp', from: 'share' })
    })
    expect(wrapper.findAll('article.ai-tool-card')).toHaveLength(2)
    expect(contentQuery.builder.all).toHaveBeenCalledOnce()

    await wrapper.get('button[data-type=""]').trigger('click')
    await vi.waitFor(() => {
      expect(router.currentRoute.value.query).toEqual({ from: 'share' })
    })
    expect(wrapper.findAll('article.ai-tool-card')).toHaveLength(4)
  })

  it('把重复或非法 type 参数归一化为全部', async () => {
    const { router, wrapper } = await mountPage('/ai-tools?from=share')

    await router.push('/ai-tools?type=skill&type=mcp&from=share')
    await vi.waitFor(() => {
      expect(router.currentRoute.value.query).toEqual({ from: 'share' })
    })
    expect(wrapper.get('button[data-type=""]').attributes('aria-pressed')).toBe('true')

    await router.push('/ai-tools?type=unknown&from=share')
    await vi.waitFor(() => {
      expect(router.currentRoute.value.query).toEqual({ from: 'share' })
    })
    expect(wrapper.findAll('article.ai-tool-card')).toHaveLength(4)
  })

  it('配置不携带筛选参数的 SEO 和 canonical', async () => {
    await mountPage('/ai-tools?type=mcp')

    await vi.waitFor(() => {
      expect(document.title).toBe('AI 工具箱｜April 的技术笔记')
    })
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content'))
      .toBe('整理常用的 Agent Skills 与 MCP，提供作用介绍、安装配置和使用示例。')
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href'))
      .toBe('https://blog.april-tong.cn/ai-tools')
  })
})
