import { ref } from 'vue'
import { describe, expect, it } from 'vitest'

import { useArticleFilters } from '../../app/composables/useArticleFilters'
import type { ArticleSummary } from '../../app/types/article'

const articles: ArticleSummary[] = [
  {
    path: '/articles/vue/1',
    title: 'Vue 入门',
    description: 'Vue 基础',
    date: '2024-04-01',
    category: 'vue',
    categoryLabel: 'Vue',
    tags: ['Vue', '基础'],
  },
  {
    path: '/articles/javascript/2',
    title: 'Axios 实践',
    description: '请求封装',
    date: '2025-02-15',
    category: 'javascript',
    categoryLabel: 'JavaScript',
    tags: ['axios', '工具'],
  },
  {
    path: '/articles/vue/3',
    title: 'Vue 工具链',
    description: 'Vue 工程化',
    date: '2025-02-15',
    category: 'vue',
    categoryLabel: 'Vue',
    tags: ['Vue', '工具'],
  },
  {
    path: '/articles/css/4',
    title: '现代 CSS',
    description: 'CSS 布局',
    date: '2023-08-02',
    category: 'css',
    categoryLabel: 'CSS',
    tags: ['CSS', '基础'],
  },
]

describe('useArticleFilters', () => {
  it('默认返回日期倒序的全部文章，同日保持输入顺序且不修改输入数组', () => {
    const source = [...articles]
    const originalOrder = source.map(article => article.path)
    const { filteredArticles } = useArticleFilters(source)

    expect(filteredArticles.value.map(article => article.path)).toEqual([
      '/articles/javascript/2',
      '/articles/vue/3',
      '/articles/vue/1',
      '/articles/css/4',
    ])
    expect(source.map(article => article.path)).toEqual(originalOrder)
  })

  it('分类和标签同时存在时返回二者交集', () => {
    const { filteredArticles, setCategory, setTag } = useArticleFilters(articles)

    setCategory('vue')
    setTag('工具')

    expect(filteredArticles.value.map(article => article.path)).toEqual([
      '/articles/vue/3',
    ])
  })

  it('切换分类时清除新分类中不可用的已选标签', () => {
    const {
      selectedTag,
      filteredArticles,
      setCategory,
      setTag,
    } = useArticleFilters(articles)

    setTag('axios')
    setCategory('vue')

    expect(selectedTag.value).toBeNull()
    expect(filteredArticles.value.map(article => article.path)).toEqual([
      '/articles/vue/3',
      '/articles/vue/1',
    ])
  })

  it('拒绝选择当前分类中不可见的标签，同时允许 null 清除标签', () => {
    const { selectedTag, setCategory, setTag } = useArticleFilters(articles)

    setCategory('vue')
    setTag('axios')
    expect(selectedTag.value).toBeNull()

    setTag('Vue')
    expect(selectedTag.value).toBe('Vue')

    setTag(null)
    expect(selectedTag.value).toBeNull()
  })

  it('未知分类返回空数组', () => {
    const { filteredArticles, setCategory } = useArticleFilters(articles)

    setCategory('not-a-category')

    expect(filteredArticles.value).toEqual([])
  })

  it('标签去重并按适合中文与字母的本地规则稳定排序', () => {
    const { availableTags } = useArticleFilters(articles)

    expect(availableTags.value).toEqual([
      '工具',
      '基础',
      'axios',
      'CSS',
      'Vue',
    ])
  })

  it('分类变化时只提供该分类涉及的去重标签', () => {
    const { availableTags, setCategory } = useArticleFilters(articles)

    setCategory('vue')

    expect(availableTags.value).toEqual(['工具', '基础', 'Vue'])
  })

  it('重置分类与标签并恢复全部结果', () => {
    const {
      selectedCategory,
      selectedTag,
      filteredArticles,
      setCategory,
      setTag,
      resetFilters,
    } = useArticleFilters(articles)

    setCategory('vue')
    setTag('工具')
    resetFilters()

    expect(selectedCategory.value).toBeNull()
    expect(selectedTag.value).toBeNull()
    expect(filteredArticles.value).toHaveLength(articles.length)
  })

  it('响应 ref 中的文章更新', () => {
    const source = ref(articles.slice(0, 1))
    const { filteredArticles } = useArticleFilters(source)

    source.value = articles.slice(0, 2)

    expect(filteredArticles.value.map(article => article.path)).toEqual([
      '/articles/javascript/2',
      '/articles/vue/1',
    ])
  })
})
