import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it } from 'vitest'

import ArticleFilters from '~/components/articles/ArticleFilters.vue'

const mountedWrappers = new Set<{ unmount: () => void }>()

afterEach(() => {
  for (const wrapper of mountedWrappers) {
    wrapper.unmount()
  }

  mountedWrappers.clear()
})

async function mountFilters(overrides: {
  selectedCategory?: string | null
} = {}) {
  const wrapper = await mountSuspended(ArticleFilters, {
    props: {
      selectedCategory: null,
      ...overrides,
    },
  })
  mountedWrappers.add(wrapper)
  return wrapper
}

describe('ArticleFilters', () => {
  it('只展示全部入口和 8 个分类，不显示标签或重置模块', async () => {
    const wrapper = await mountFilters()
    const section = wrapper.get('section.article-filters')
    const categoryGroup = section.get('[role="group"][aria-label="按分类筛选"]')
    const buttons = categoryGroup.findAll('button')

    expect(section.attributes('aria-label')).toBe('文章筛选')
    expect(buttons).toHaveLength(9)
    expect(buttons.map(button => button.text())).toEqual([
      '全部',
      'Vue',
      'JavaScript',
      'CSS',
      '工具',
      '工程化',
      '周边技术',
      '简单算法',
      '生活随笔',
    ])
    expect(section.find('label[for="article-tag-filter"]').exists()).toBe(false)
    expect(section.find('select#article-tag-filter').exists()).toBe(false)
    expect(section.find('[data-testid="reset-article-filters"]').exists()).toBe(false)
  })

  it('通过 aria-pressed 暴露当前分类并发出分类选择事件', async () => {
    const wrapper = await mountFilters({ selectedCategory: 'vue' })
    const allButton = wrapper.get('button[data-category=""]')
    const vueButton = wrapper.get('button[data-category="vue"]')

    expect(allButton.attributes('aria-pressed')).toBe('false')
    expect(vueButton.attributes('aria-pressed')).toBe('true')

    await wrapper.get('button[data-category="css"]').trigger('click')
    await allButton.trigger('click')

    expect(wrapper.emitted('select-category')).toEqual([['css'], [null]])
  })

})
