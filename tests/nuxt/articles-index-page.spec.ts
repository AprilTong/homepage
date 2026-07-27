import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { Router } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ArticlesIndexPage from '~/pages/articles/index.vue'
import type { ArticleSummary } from '~/types/article'

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

const articles: ArticleSummary[] = [
  {
    path: '/articles/vue/21',
    title: 'Vue 响应式原理',
    description: '从依赖收集理解 Vue 响应式。',
    date: '2025-02-15',
    category: 'vue',
    categoryLabel: 'Vue',
    tags: ['Vue', '源码'],
  },
  {
    path: '/articles/css/14',
    title: 'CSS 布局笔记',
    description: '整理现代布局方式。',
    date: '2024-08-02',
    category: 'css',
    categoryLabel: 'CSS',
    tags: ['CSS'],
  },
  {
    path: '/articles/life/13',
    title: '旅行随笔',
    description: '记录旅途中的片段。',
    date: '2023-06-01',
    category: 'life',
    categoryLabel: '生活随笔',
    tags: ['生活'],
  },
]

const mountedWrappers = new Set<{ unmount: () => void }>()

beforeEach(() => {
  contentQuery.queryCollection.mockClear()
  contentQuery.builder.where.mockClear()
  contentQuery.builder.order.mockClear()
  contentQuery.builder.select.mockClear()
  contentQuery.builder.all.mockReset().mockResolvedValue(articles)
})

afterEach(() => {
  for (const wrapper of mountedWrappers) {
    wrapper.unmount()
  }

  mountedWrappers.clear()
  vi.restoreAllMocks()
})

async function mountPage(initialLocation = '/articles') {
  const wrapper = await mountSuspended(ArticlesIndexPage, {
    route: initialLocation,
  })
  mountedWrappers.add(wrapper)
  await flushPromises()
  const router = wrapper.vm.$router as Router
  const replace = vi.spyOn(router, 'replace')

  return { replace, router, wrapper }
}

describe('文章列表页', () => {
  it('只查询一次已发布文章并装配分类筛选和列表', async () => {
    const { wrapper } = await mountPage()

    expect(contentQuery.queryCollection).toHaveBeenCalledOnce()
    expect(contentQuery.queryCollection).toHaveBeenCalledWith('articles')
    expect(contentQuery.builder.where).toHaveBeenCalledWith('draft', '=', false)
    expect(contentQuery.builder.order.mock.calls).toEqual([
      ['date', 'DESC'],
      ['path', 'ASC'],
    ])
    expect(contentQuery.builder.select).toHaveBeenCalledWith(
      'path',
      'title',
      'description',
      'date',
      'category',
      'categoryLabel',
      'tags',
    )
    expect(contentQuery.builder.all).toHaveBeenCalledOnce()

    expect(wrapper.find('header.articles-hero').exists()).toBe(false)
    expect(wrapper.find('h1#articles-title').exists()).toBe(false)
    expect(wrapper.get('section.article-filters').element.tagName).toBe('SECTION')
    expect(wrapper.findAll('article.article-card')).toHaveLength(3)
  })

  it('从查询参数初始化分类筛选，并以 replace 同步筛选且保留无关参数', async () => {
    const { replace, router, wrapper } = await mountPage(
      '/articles?category=vue&tag=Vue&from=share',
    )

    expect(wrapper.get('button[data-category="vue"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.findAll('article.article-card')).toHaveLength(1)
    expect(wrapper.get('article.article-card h2').text()).toBe('Vue 响应式原理')
    expect(replace).not.toHaveBeenCalled()

    await wrapper.get('button[data-category="css"]').trigger('click')
    await vi.waitFor(() => {
      expect(replace).toHaveBeenCalledOnce()
      expect(router.currentRoute.value.query).toEqual({
        category: 'css',
        from: 'share',
      })
    })
    expect(wrapper.findAll('article.article-card')).toHaveLength(1)
    expect(wrapper.get('article.article-card h2').text()).toBe('CSS 布局笔记')
    expect(contentQuery.builder.all).toHaveBeenCalledOnce()

    await wrapper.get('button[data-category=""]').trigger('click')
    await vi.waitFor(() => {
      expect(replace).toHaveBeenCalledTimes(2)
      expect(router.currentRoute.value.query).toEqual({ from: 'share' })
    })
    expect(wrapper.findAll('article.article-card')).toHaveLength(3)
    expect(contentQuery.builder.all).toHaveBeenCalledOnce()
  })

  it('响应外部导航并通过浏览器历史恢复分类筛选，不重复查询内容', async () => {
    const { replace, router, wrapper } = await mountPage(
      '/articles?category=vue&from=share',
    )

    await router.push('/articles?category=css&from=share')
    await flushPromises()

    expect(wrapper.get('button[data-category="css"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.findAll('article.article-card')).toHaveLength(1)
    expect(wrapper.get('article.article-card h2').text()).toBe('CSS 布局笔记')

    router.back()
    await vi.waitFor(() => {
      expect(router.currentRoute.value.query).toEqual({
        category: 'vue',
        from: 'share',
      })
      expect(wrapper.get('button[data-category="vue"]').attributes('aria-pressed')).toBe('true')
    })

    expect(wrapper.get('article.article-card h2').text()).toBe('Vue 响应式原理')

    router.forward()
    await vi.waitFor(() => {
      expect(router.currentRoute.value.query).toEqual({
        category: 'css',
        from: 'share',
      })
      expect(wrapper.get('button[data-category="css"]').attributes('aria-pressed')).toBe('true')
    })

    expect(wrapper.get('article.article-card h2').text()).toBe('CSS 布局笔记')
    expect(replace).not.toHaveBeenCalled()
    expect(contentQuery.builder.all).toHaveBeenCalledOnce()
  })

  it('快速连续切换时只导航到最终筛选状态', async () => {
    const { replace, router, wrapper } = await mountPage(
      '/articles?category=vue&from=share',
    )
    const cssButton = wrapper.get('button[data-category="css"]').element as HTMLButtonElement
    const lifeButton = wrapper.get('button[data-category="life"]').element as HTMLButtonElement

    cssButton.click()
    lifeButton.click()

    await vi.waitFor(() => {
      expect(router.currentRoute.value.query).toEqual({
        category: 'life',
        from: 'share',
      })
    })

    expect(replace).toHaveBeenCalledOnce()
    expect(wrapper.get('button[data-category="life"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('article.article-card h2').text()).toBe('旅行随笔')
    expect(contentQuery.builder.all).toHaveBeenCalledOnce()
  })

  it('规范化重复、遗留标签和空筛选参数，同时保留无关查询', async () => {
    const { router, wrapper } = await mountPage('/articles?from=share')

    await router.push(
      '/articles?category=css&category=vue&tag=CSS&tag=Vue&from=share',
    )
    await vi.waitFor(() => {
      expect(router.currentRoute.value.query).toEqual({
        category: 'css',
        from: 'share',
      })
    })
    expect(wrapper.get('button[data-category="css"]').attributes('aria-pressed')).toBe('true')

    await router.push('/articles?category=css&tag=Vue&from=share')
    await vi.waitFor(() => {
      expect(router.currentRoute.value.query).toEqual({
        category: 'css',
        from: 'share',
      })
    })
    expect(wrapper.get('article.article-card h2').text()).toBe('CSS 布局笔记')

    await router.push('/articles?category=&tag=&from=share')
    await vi.waitFor(() => {
      expect(router.currentRoute.value.query).toEqual({ from: 'share' })
    })
    expect(wrapper.findAll('article.article-card')).toHaveLength(3)
    expect(contentQuery.builder.all).toHaveBeenCalledOnce()
  })

  it('配置不携带筛选参数的 SEO 和 canonical', async () => {
    await mountPage('/articles?category=vue&tag=Vue')

    await vi.waitFor(() => {
      expect(document.title).toBe('文章｜April 的技术笔记')
    })
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content'))
      .toBe('浏览 April 的前端技术笔记、源码学习、工程实践与生活随笔。')
    expect(document.head.querySelector('meta[property="og:title"]')?.getAttribute('content'))
      .toBe('文章｜April 的技术笔记')
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href'))
      .toBe('https://blog.april-tong.cn/articles')
  })
})
