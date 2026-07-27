import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it } from 'vitest'

import ArticleToc from '~/components/articles/ArticleToc.vue'

const mountedWrappers = new Set<{ unmount: () => void }>()

afterEach(() => {
  for (const wrapper of mountedWrappers) {
    wrapper.unmount()
  }

  mountedWrappers.clear()
})

async function mountToc(links?: unknown[]) {
  const wrapper = await mountSuspended(ArticleToc, {
    props: { links },
  })
  mountedWrappers.add(wrapper)
  return wrapper
}

describe('ArticleToc', () => {
  it('以带名称的导航和嵌套列表展示标题锚点', async () => {
    const wrapper = await mountToc([
      {
        id: 'intro',
        depth: 2,
        text: '开始',
        children: [
          {
            id: 'details',
            depth: 3,
            text: '细节',
            children: [
              {
                id: 'example',
                depth: 4,
                text: '示例',
              },
            ],
          },
        ],
      },
    ])

    const navigation = wrapper.get('nav')
    expect(navigation.attributes('aria-label')).toBe('文章目录')
    expect(navigation.get('h2').text()).toBe('目录')
    expect(navigation.findAll('ol')).toHaveLength(3)
    expect(navigation.findAll('a').map(link => ({
      href: link.attributes('href'),
      text: link.text(),
    }))).toEqual([
      { href: '#intro', text: '开始' },
      { href: '#details', text: '细节' },
      { href: '#example', text: '示例' },
    ])
  })

  it('最多递归三层且始终从 id 构造安全的页内链接', async () => {
    const wrapper = await mountToc([
      {
        id: 'javascript:alert(1)',
        text: '仍是页内链接',
        children: [
          {
            id: 'second',
            text: '第二层',
            children: [
              {
                id: 'third',
                text: '第三层',
                children: [
                  { id: 'fourth', text: '不展示的第四层' },
                ],
              },
            ],
          },
        ],
      },
      { id: '', text: '无效标题' },
    ])

    const links = wrapper.findAll('a')
    expect(links).toHaveLength(3)
    expect(links[0]?.attributes('href')).toBe('#javascript:alert(1)')
    expect(wrapper.text()).not.toContain('不展示的第四层')
    expect(wrapper.text()).not.toContain('无效标题')
    expect(links.every(link => link.attributes('href')?.startsWith('#'))).toBe(true)
  })

  it.each([undefined, []])('目录为 %s 时不渲染空导航', async links => {
    const wrapper = await mountToc(links)

    expect(wrapper.find('nav').exists()).toBe(false)
  })
})
