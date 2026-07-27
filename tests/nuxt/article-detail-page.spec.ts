import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ArticleDetailPage from '~/pages/articles/[category]/[id].vue'

const contentQuery = vi.hoisted(() => {
  const current = {
    where: vi.fn(),
    path: vi.fn(),
    first: vi.fn(),
  }
  const navigation = {
    where: vi.fn(),
    order: vi.fn(),
    select: vi.fn(),
    all: vi.fn(),
  }
  const queryCollection = vi.fn()

  current.where.mockReturnValue(current)
  current.path.mockReturnValue(current)
  navigation.where.mockReturnValue(navigation)
  navigation.order.mockReturnValue(navigation)
  navigation.select.mockReturnValue(navigation)

  return { current, navigation, queryCollection }
})

const errorFactory = vi.hoisted(() => ({
  createError: vi.fn((input: {
    statusCode: number
    statusMessage: string
    message: string
  }) =>
    Object.assign(new Error(input.message), input),
  ),
}))

const asyncData = vi.hoisted(() => ({
  useAsyncData: vi.fn(),
}))

const routeImport = vi.hoisted(() => {
  const route = { path: '/articles/vue/21' }
  return {
    route,
    useRoute: vi.fn(() => route),
  }
})

mockNuxtImport('queryCollection', () => contentQuery.queryCollection)
mockNuxtImport('createError', () => errorFactory.createError)
mockNuxtImport('useAsyncData', () => asyncData.useAsyncData)
mockNuxtImport('useRoute', () => routeImport.useRoute)

const article = {
  path: '/articles/vue/21',
  title: 'Vue </script><script>alert(1)</script>',
  description: '从依赖收集理解 Vue 响应式。',
  date: '2025-02-15',
  category: 'vue',
  categoryLabel: 'Vue',
  tags: ['Vue', '源码'],
  body: {
    type: 'root',
    children: [],
    toc: {
      links: [
        {
          id: 'reactivity',
          depth: 2,
          text: '响应式',
        },
      ],
    },
  },
}

const navigationArticles = [
  {
    path: '/articles/css/14',
    title: '更新的 CSS',
    date: '2025-03-01',
    category: 'css',
    categoryLabel: 'CSS',
  },
  {
    path: '/articles/vue/21',
    title: article.title,
    date: article.date,
    category: article.category,
    categoryLabel: article.categoryLabel,
  },
  {
    path: '/articles/javascript/23',
    title: '更早的 JavaScript',
    date: '2025-01-20',
    category: 'javascript',
    categoryLabel: 'JavaScript',
  },
]

const mountedWrappers = new Set<{ unmount: () => void }>()

beforeEach(() => {
  contentQuery.queryCollection.mockReset()
    .mockReturnValueOnce(contentQuery.current)
    .mockReturnValueOnce(contentQuery.navigation)
  contentQuery.current.where.mockClear()
  contentQuery.current.path.mockClear()
  contentQuery.current.first.mockReset().mockResolvedValue(article)
  contentQuery.navigation.where.mockClear()
  contentQuery.navigation.order.mockClear()
  contentQuery.navigation.select.mockClear()
  contentQuery.navigation.all.mockReset().mockResolvedValue(navigationArticles)
  errorFactory.createError.mockClear()
  asyncData.useAsyncData.mockReset().mockImplementation(async (
    _key: string,
    handler: () => Promise<unknown>,
  ) => {
    try {
      return {
        data: ref(await handler()),
        error: ref(null),
      }
    }
    catch (error) {
      return {
        data: ref(undefined),
        error: ref(error),
      }
    }
  })
  routeImport.route.path = article.path
  routeImport.useRoute.mockClear()
})

afterEach(async () => {
  for (const wrapper of mountedWrappers) {
    wrapper.unmount()
  }

  mountedWrappers.clear()
  await flushPromises()
  vi.restoreAllMocks()
})

async function mountPage(path = article.path) {
  routeImport.route.path = path
  const wrapper = await mountSuspended(ArticleDetailPage, {
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
  mountedWrappers.add(wrapper)
  await flushPromises()
  return wrapper
}

describe('文章详情页', () => {
  it('按完整路由查询一次正文，并用独立摘要查询确定相邻文章', async () => {
    const wrapper = await mountPage()

    expect(asyncData.useAsyncData).toHaveBeenCalledOnce()
    expect(asyncData.useAsyncData).toHaveBeenCalledWith(
      'article-detail:/articles/vue/21',
      expect.any(Function),
    )
    expect(contentQuery.queryCollection).toHaveBeenCalledTimes(2)
    expect(contentQuery.queryCollection).toHaveBeenNthCalledWith(1, 'articles')
    expect(contentQuery.current.where).toHaveBeenCalledWith('draft', '=', false)
    expect(contentQuery.current.path).toHaveBeenCalledOnce()
    expect(contentQuery.current.path).toHaveBeenCalledWith('/articles/vue/21')
    expect(contentQuery.current.first).toHaveBeenCalledOnce()

    expect(contentQuery.queryCollection).toHaveBeenNthCalledWith(2, 'articles')
    expect(contentQuery.navigation.where).toHaveBeenCalledWith('draft', '=', false)
    expect(contentQuery.navigation.order.mock.calls).toEqual([
      ['date', 'DESC'],
      ['path', 'ASC'],
    ])
    expect(contentQuery.navigation.select).toHaveBeenCalledWith(
      'path',
      'title',
      'date',
      'category',
      'categoryLabel',
    )
    expect(contentQuery.navigation.all).toHaveBeenCalledOnce()

    const navigation = wrapper.get('nav.article-neighbors')
    const links = navigation.findAll('a')
    expect(links.map(link => ({
      href: link.attributes('href'),
      text: link.text(),
    }))).toEqual([
      { href: '/articles/css/14', text: '上一篇：更新的 CSS' },
      { href: '/articles/javascript/23', text: '下一篇：更早的 JavaScript' },
    ])
  })

  it('渲染文章元数据、正文和目录，并提供返回列表入口', async () => {
    const wrapper = await mountPage()

    expect(wrapper.get('main').attributes('aria-labelledby')).toBe('article-title')
    expect(wrapper.get('h1#article-title').text()).toBe(article.title)
    expect(wrapper.get('time').attributes('datetime')).toBe(article.date)
    expect(wrapper.get('time').text()).toBe(article.date)
    expect(wrapper.get('[data-testid="article-category"]').text()).toBe('Vue')
    expect(
      wrapper.findAll('[data-testid="article-tag"]').map(tag => tag.text()),
    ).toEqual(['Vue', '源码'])
    expect(wrapper.get('[data-testid="content-renderer"]').text()).toBe(article.title)
    expect(wrapper.get('nav.article-toc').text()).toContain('响应式')
    expect(wrapper.get('[data-testid="back-to-articles"]').attributes('href'))
      .toBe('/articles')
  })

  it('配置 canonical、文章 Open Graph 元数据和可安全解析的 BlogPosting JSON-LD', async () => {
    await mountPage()
    const canonical = 'https://blog.april-tong.cn/articles/vue/21'

    await vi.waitFor(() => {
      expect(document.title).toBe(`${article.title}｜April 的技术笔记`)
    })
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href'))
      .toBe(canonical)
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content'))
      .toBe(article.description)
    expect(document.head.querySelector('meta[property="og:title"]')?.getAttribute('content'))
      .toBe(article.title)
    expect(document.head.querySelector('meta[property="og:description"]')?.getAttribute('content'))
      .toBe(article.description)
    expect(document.head.querySelector('meta[property="og:type"]')?.getAttribute('content'))
      .toBe('article')
    expect(document.head.querySelector('meta[property="article:published_time"]')?.getAttribute('content'))
      .toBe(article.date)

    const jsonLdElement = document.head.querySelector<HTMLScriptElement>(
      'script#article-json-ld[type="application/ld+json"]',
    )
    expect(jsonLdElement).not.toBeNull()
    expect(jsonLdElement?.textContent).not.toContain('</script>')
    expect(JSON.parse(jsonLdElement?.textContent ?? '')).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: article.title,
      description: article.description,
      datePublished: article.date,
      author: {
        '@type': 'Person',
        name: 'AprilTong',
      },
      url: canonical,
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': canonical,
      },
    })
  })

  it('路由带尾斜杠时仍按请求路径查询，但使用文章规范路径生成 SEO URL', async () => {
    await mountPage('/articles/vue/21/')

    expect(contentQuery.current.path).toHaveBeenCalledWith('/articles/vue/21/')
    expect(asyncData.useAsyncData).toHaveBeenCalledWith(
      'article-detail:/articles/vue/21/',
      expect.any(Function),
    )
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href'))
      .toBe('https://blog.april-tong.cn/articles/vue/21')

    const jsonLdElement = document.head.querySelector<HTMLScriptElement>(
      'script#article-json-ld[type="application/ld+json"]',
    )
    expect(JSON.parse(jsonLdElement?.textContent ?? '').url)
      .toBe('https://blog.april-tong.cn/articles/vue/21')
  })

  it('当前路径不在摘要结果时不误链相邻文章', async () => {
    contentQuery.navigation.all.mockResolvedValue(
      navigationArticles.filter(item => item.path !== article.path),
    )
    const wrapper = await mountPage()

    expect(wrapper.find('nav.article-neighbors').exists()).toBe(false)
  })

  it('过滤草稿后的正文不存在时抛出 404，且不执行相邻查询或输出正文 SEO', async () => {
    contentQuery.current.first.mockResolvedValue(null)

    await expect(mountPage('/articles/vue/404')).rejects.toMatchObject({
      statusCode: 404,
    })

    expect(contentQuery.queryCollection).toHaveBeenCalledOnce()
    expect(contentQuery.current.where).toHaveBeenCalledWith('draft', '=', false)
    expect(contentQuery.current.path).toHaveBeenCalledWith('/articles/vue/404')
    expect(contentQuery.navigation.all).not.toHaveBeenCalled()
    expect(errorFactory.createError).toHaveBeenCalledWith({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: '文章不存在',
    })
    expect(document.head.querySelector('script#article-json-ld')).toBeNull()
  })

  it('正文查询故障时透传原始错误，不误报 404 或继续查询相邻文章', async () => {
    const queryError = new Error('content database unavailable')
    contentQuery.current.first.mockRejectedValue(queryError)

    await expect(mountPage()).rejects.toBe(queryError)

    expect(contentQuery.queryCollection).toHaveBeenCalledOnce()
    expect(contentQuery.current.where).toHaveBeenCalledWith('draft', '=', false)
    expect(contentQuery.current.path).toHaveBeenCalledWith(article.path)
    expect(contentQuery.navigation.all).not.toHaveBeenCalled()
    expect(errorFactory.createError).not.toHaveBeenCalled()
  })
})
