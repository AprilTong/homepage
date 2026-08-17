import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import AiToolDetailPage from '~/pages/ai-tools/[slug].vue'

const contentQuery = vi.hoisted(() => {
  const current = { where: vi.fn(), path: vi.fn(), first: vi.fn() }
  const related = { where: vi.fn(), order: vi.fn(), select: vi.fn(), all: vi.fn() }
  const queryCollection = vi.fn()
  current.where.mockReturnValue(current)
  current.path.mockReturnValue(current)
  related.where.mockReturnValue(related)
  related.order.mockReturnValue(related)
  related.select.mockReturnValue(related)
  return { current, queryCollection, related }
})
const errorFactory = vi.hoisted(() => ({
  createError: vi.fn((input: { statusCode: number, statusMessage: string, message: string }) =>
    Object.assign(new Error(input.message), input)),
}))
const asyncData = vi.hoisted(() => ({ useAsyncData: vi.fn() }))
const routeImport = vi.hoisted(() => {
  const route = { path: '/ai-tools/superpowers' }
  return { route, useRoute: vi.fn(() => route) }
})

mockNuxtImport('queryCollection', () => contentQuery.queryCollection)
mockNuxtImport('createError', () => errorFactory.createError)
mockNuxtImport('useAsyncData', () => asyncData.useAsyncData)
mockNuxtImport('useRoute', () => routeImport.useRoute)

const tool = {
  path: '/ai-tools/superpowers',
  title: 'Superpowers </script><script>alert(1)</script>',
  description: '结构化 AI 编程工作流。',
  type: 'skill' as const,
  order: 1,
  platforms: ['Codex', 'Claude Code'],
  tags: ['TDD', '调试'],
  officialUrl: 'https://github.com/obra/superpowers',
  repositoryUrl: 'https://github.com/obra/superpowers',
  featured: true,
  draft: false,
  body: {
    type: 'root',
    children: [],
    toc: { links: [{ id: 'install', depth: 2, text: '安装方式' }] },
  },
}
const relatedTools = [
  tool,
  {
    path: '/ai-tools/frontend-design',
    title: 'Frontend Design',
    description: '前端设计。',
    type: 'skill',
    order: '10',
    platforms: ['Codex'],
    tags: ['UI'],
    officialUrl: 'https://example.com/frontend-design',
    featured: false,
  },
  {
    path: '/ai-tools/taste-skill',
    title: 'Taste Skill',
    description: '设计规则。',
    type: 'skill',
    order: '2',
    platforms: ['Codex'],
    tags: ['UI'],
    officialUrl: 'https://example.com/taste',
    featured: true,
  },
]
const wrappers = new Set<{ unmount: () => void }>()

beforeEach(() => {
  contentQuery.queryCollection.mockReset()
    .mockReturnValueOnce(contentQuery.current)
    .mockReturnValueOnce(contentQuery.related)
  contentQuery.current.where.mockClear()
  contentQuery.current.path.mockClear()
  contentQuery.current.first.mockReset().mockResolvedValue(tool)
  contentQuery.related.where.mockClear()
  contentQuery.related.order.mockClear()
  contentQuery.related.select.mockClear()
  contentQuery.related.all.mockReset().mockResolvedValue(relatedTools)
  errorFactory.createError.mockClear()
  asyncData.useAsyncData.mockReset().mockImplementation(async (_key: string, handler: () => Promise<unknown>) => {
    try {
      return { data: ref(await handler()), error: ref(null) }
    }
    catch (error) {
      return { data: ref(undefined), error: ref(error) }
    }
  })
  routeImport.route.path = tool.path
})

afterEach(async () => {
  for (const wrapper of wrappers)
    wrapper.unmount()
  wrappers.clear()
  await flushPromises()
  vi.restoreAllMocks()
})

async function mountPage(path = tool.path) {
  routeImport.route.path = path
  const wrapper = await mountSuspended(AiToolDetailPage, {
    route: path,
    global: {
      stubs: {
        ContentRenderer: {
          props: ['value'],
          template: '<div data-testid="content-renderer">{{ value.title }}</div>',
        },
      },
    },
  })
  wrappers.add(wrapper)
  await flushPromises()
  return wrapper
}

describe('AI 工具详情页', () => {
  it('按完整路径查询正文，并查询同类型推荐', async () => {
    const wrapper = await mountPage()

    expect(asyncData.useAsyncData).toHaveBeenCalledWith(
      'ai-tool-detail:/ai-tools/superpowers',
      expect.any(Function),
    )
    expect(contentQuery.queryCollection).toHaveBeenNthCalledWith(1, 'aiTools')
    expect(contentQuery.current.where).toHaveBeenCalledWith('draft', '=', false)
    expect(contentQuery.current.path).toHaveBeenCalledWith(tool.path)

    expect(contentQuery.queryCollection).toHaveBeenNthCalledWith(2, 'aiTools')
    expect(contentQuery.related.where.mock.calls).toEqual([
      ['draft', '=', false],
      ['type', '=', 'skill'],
    ])
    expect(contentQuery.related.order.mock.calls).toEqual([
      ['order', 'ASC'],
      ['title', 'ASC'],
    ])
    expect(wrapper.findAll('.ai-tool-recommendations article.ai-tool-card')).toHaveLength(2)
    expect(wrapper.findAll('.ai-tool-recommendations h3').map(node => node.text()))
      .toEqual(['Taste Skill', 'Frontend Design'])
  })

  it('渲染工具元数据、正文、侧栏和返回入口', async () => {
    const wrapper = await mountPage()

    expect(wrapper.get('main').attributes('aria-labelledby')).toBe('ai-tool-title')
    expect(wrapper.get('h1#ai-tool-title').text()).toBe(tool.title)
    expect(wrapper.get('[data-testid="ai-tool-type"]').text()).toBe('Skill')
    expect(wrapper.findAll('[data-testid="ai-tool-platform"]').map(node => node.text()))
      .toEqual(['Codex', 'Claude Code'])
    expect(wrapper.findAll('[data-testid="ai-tool-tag"]').map(node => node.text()))
      .toEqual(['TDD', '调试'])
    expect(wrapper.get('[data-testid="content-renderer"]').text()).toBe(tool.title)
    expect(wrapper.get('[data-testid="back-to-ai-tools"]').attributes('href')).toBe('/ai-tools')

    const official = wrapper.get(`a[href="${tool.officialUrl}"]`)
    expect(official.attributes('target')).toBe('_blank')
    expect(official.attributes('rel')).toBe('noreferrer')
    expect(wrapper.get('nav.article-toc').text()).toContain('安装方式')
  })

  it('配置 canonical 与安全的 SoftwareApplication JSON-LD', async () => {
    await mountPage()
    const canonical = 'https://blog.april-tong.cn/ai-tools/superpowers'

    await vi.waitFor(() => {
      expect(document.title).toBe(`${tool.title}｜AI 工具箱｜April 的技术笔记`)
    })
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(canonical)
    expect(document.head.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(tool.title)

    const script = document.head.querySelector<HTMLScriptElement>(
      'script#ai-tool-json-ld[type="application/ld+json"]',
    )
    expect(script?.textContent).not.toContain('</script>')
    expect(JSON.parse(script?.textContent ?? '')).toEqual({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: tool.title,
      description: tool.description,
      applicationCategory: 'DeveloperApplication',
      url: tool.officialUrl,
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    })
  })

  it('工具不存在时抛出 404 且不查询推荐', async () => {
    contentQuery.current.first.mockResolvedValue(null)

    await expect(mountPage('/ai-tools/missing')).rejects.toMatchObject({ statusCode: 404 })
    expect(contentQuery.queryCollection).toHaveBeenCalledOnce()
    expect(contentQuery.related.all).not.toHaveBeenCalled()
    expect(errorFactory.createError).toHaveBeenCalledWith({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'AI 工具不存在',
    })
  })

  it('正文查询故障时透传错误', async () => {
    const queryError = new Error('content unavailable')
    contentQuery.current.first.mockRejectedValue(queryError)

    await expect(mountPage()).rejects.toBe(queryError)
    expect(contentQuery.queryCollection).toHaveBeenCalledOnce()
    expect(errorFactory.createError).not.toHaveBeenCalled()
  })
})
