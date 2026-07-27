import { mountSuspended } from '@nuxt/test-utils/runtime'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, describe, expect, it } from 'vitest'

import ArticleList from '~/components/articles/ArticleList.vue'
import type { ArticleSummary } from '~/types/article'

const mountedWrappers = new Set<{ unmount: () => void }>()

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
]

async function mountList(items: ArticleSummary[] = articles) {
  const routeComponent = { render: () => null }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/articles/:category/:id',
        component: routeComponent,
      },
    ],
  })
  const wrapper = await mountSuspended(ArticleList, {
    route: false,
    props: { articles: items },
    global: { plugins: [router] },
  })
  mountedWrappers.add(wrapper)
  return wrapper
}

afterEach(() => {
  for (const wrapper of mountedWrappers) {
    wrapper.unmount()
  }

  mountedWrappers.clear()
})

describe('ArticleList', () => {
  it('桌面端以三列卡片展示，并与页头使用相同内容宽度', async () => {
    const stylesheet = await readFile(
      resolve(process.cwd(), 'app/assets/css/main.css'),
      'utf8',
    )

    expect(stylesheet).toMatch(
      /\.article-list\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/s,
    )
    expect(stylesheet).toMatch(
      /\.articles-page > main\s*\{[^}]*width:\s*min\(100%, 1220px\)/s,
    )
    expect(stylesheet).toMatch(
      /@media \(max-width: 720px\)\s*\{[\s\S]*?\.article-list\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/,
    )
    expect(stylesheet).toMatch(
      /\.article-card > p\s*\{[^}]*-webkit-line-clamp:\s*3/s,
    )
    expect(stylesheet).toMatch(
      /\.article-card h2\s*\{[^}]*white-space:\s*nowrap/s,
    )
    expect(stylesheet).toMatch(
      /\.article-card__category\s*\{[^}]*border:\s*1px solid/s,
    )
  })

  it('以可访问列表展示文章链接和全部元数据', async () => {
    const wrapper = await mountList()
    const list = wrapper.get('ol.article-list')
    const cards = list.findAll('article.article-card')

    expect(list.attributes('aria-label')).toBe('文章列表')
    expect(cards).toHaveLength(2)

    const firstCard = cards[0]!
    const titleLink = firstCard.get('h2 a')
    const publishedAt = firstCard.get('time')

    expect(titleLink.text()).toBe('Vue 响应式原理')
    expect(titleLink.attributes('href')).toBe('/articles/vue/21')
    expect(titleLink.attributes('title')).toBe('Vue 响应式原理')
    expect(firstCard.text()).toContain('从依赖收集理解 Vue 响应式。')
    expect(publishedAt.attributes('datetime')).toBe('2025-02-15')
    expect(publishedAt.text()).toBe('2025-02-15')
    const category = firstCard.get('[data-testid="article-category"]')
    expect(category.text()).toBe('Vue')
    expect(category.classes()).toContain('article-card__category')
    expect(firstCard.findAll('[data-testid="article-tag"]')).toHaveLength(0)
  })

  it('没有文章时展示状态说明和可操作的重置入口', async () => {
    const wrapper = await mountList([])
    const emptyState = wrapper.get('[data-testid="article-empty-state"]')

    expect(wrapper.find('ol.article-list').exists()).toBe(false)
    expect(emptyState.get('[role="status"]').text()).toBe('没有找到符合条件的文章。')

    const reset = emptyState.get('button')
    expect(reset.text()).toBe('重置筛选')
    expect(reset.attributes('type')).toBe('button')

    await reset.trigger('click')
    expect(wrapper.emitted('reset')).toEqual([[]])
  })
})
