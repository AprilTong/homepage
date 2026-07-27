import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, describe, expect, it } from 'vitest'

import IndexPage from '~/pages/index.vue'

const mountedWrappers = new Set<{ unmount: () => void }>()
const routeComponent = { render: () => null }
const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: routeComponent },
    { path: '/articles', component: routeComponent },
    { path: '/timeline', component: routeComponent },
    { path: '/about', component: routeComponent },
  ],
})

afterEach(() => {
  for (const wrapper of mountedWrappers) {
    wrapper.unmount()
  }

  mountedWrappers.clear()
})

async function mountPage() {
  const wrapper = await mountSuspended(IndexPage, {
    route: false,
    global: { plugins: [router] },
  })
  mountedWrappers.add(wrapper)
  await flushPromises()
  return wrapper
}

describe('首页', () => {
  it('只装配导航和聊天主体，不渲染文章卡片', async () => {
    const wrapper = await mountPage()
    const shell = wrapper.get('.home-shell')
    const main = shell.get('main')

    expect(shell.get('header.app-header').element.tagName).toBe('HEADER')
    expect(main.attributes('aria-label')).toBe('AI 知识库首页')
    expect(main.get('section.knowledge-chat').attributes('aria-label')).toBe('April AI 知识库对话')
    expect(wrapper.find('[data-testid="article-card"]').exists()).toBe(false)
  })

  it('向真实 document head 写入 SEO、canonical 与 WebSite 结构化数据', async () => {
    await mountPage()

    expect(document.title).toBe('April AI｜从我的技术笔记中寻找答案')
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content'))
      .toBe('与 April 的个人知识库对话，检索前端技术笔记、源码学习与实践记录。')
    expect(document.head.querySelector('meta[property="og:title"]')?.getAttribute('content'))
      .toBe('April AI｜个人知识库')
    expect(document.head.querySelector('meta[property="og:description"]')?.getAttribute('content'))
      .toBe('从技术笔记和知识文档中寻找答案。')
    expect(document.head.querySelector('meta[property="og:type"]')?.getAttribute('content'))
      .toBe('website')
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href'))
      .toBe('https://blog.april-tong.cn/')

    const structuredDataScripts = document.head.querySelectorAll<HTMLScriptElement>(
      'script#website-json-ld[type="application/ld+json"]',
    )
    const structuredData = structuredDataScripts.item(0)

    expect(structuredDataScripts).toHaveLength(1)
    expect(JSON.parse(structuredData?.textContent ?? '')).toEqual({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'April AI',
      url: 'https://blog.april-tong.cn/',
      author: {
        '@type': 'Person',
        name: 'AprilTong',
      },
    })
  })
})
