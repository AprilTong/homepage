import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue'

import type { ArticleSummary } from '../types/article'

const tagCollator = new Intl.Collator('zh-CN')

export function useArticleFilters(articles: MaybeRefOrGetter<ArticleSummary[]>) {
  const selectedCategory = ref<string | null>(null)
  const selectedTag = ref<string | null>(null)

  const articlesInSelectedCategory = computed(() => {
    const source = toValue(articles)

    if (selectedCategory.value === null) {
      return source
    }

    return source.filter(article => article.category === selectedCategory.value)
  })

  const availableTags = computed(() => {
    return [...new Set(articlesInSelectedCategory.value.flatMap(article => article.tags))]
      .sort((left, right) => tagCollator.compare(left, right))
  })

  const filteredArticles = computed(() => {
    return articlesInSelectedCategory.value
      .filter(article =>
        selectedTag.value === null || article.tags.includes(selectedTag.value),
      )
      .map((article, index) => ({ article, index }))
      .sort((left, right) => {
        const dateOrder = Date.parse(right.article.date) - Date.parse(left.article.date)
        return dateOrder || left.index - right.index
      })
      .map(({ article }) => article)
  })

  function setCategory(category: string | null) {
    selectedCategory.value = category

    if (
      selectedTag.value !== null
      && !availableTags.value.includes(selectedTag.value)
    ) {
      selectedTag.value = null
    }
  }

  function setTag(tag: string | null) {
    selectedTag.value = tag !== null && availableTags.value.includes(tag)
      ? tag
      : null
  }

  function resetFilters() {
    selectedCategory.value = null
    selectedTag.value = null
  }

  return {
    selectedCategory,
    selectedTag,
    availableTags,
    filteredArticles,
    setCategory,
    setTag,
    resetFilters,
  }
}
