<script setup lang="ts">
import ArticleFilters from '~/components/articles/ArticleFilters.vue'
import ArticleList from '~/components/articles/ArticleList.vue'
import type { ArticleSummary } from '~/types/article'

const canonicalUrl = 'https://blog.april-tong.cn/articles'
const seoTitle = '文章｜April 的技术笔记'
const seoDescription = '浏览 April 的前端技术笔记、源码学习、工程实践与生活随笔。'

const route = useRoute()
const router = useRouter()
const { data: articles } = await useAsyncData('articles-index', () =>
  queryCollection('articles')
    .where('draft', '=', false)
    .order('date', 'DESC')
    .order('path', 'ASC')
    .select(
      'path',
      'title',
      'description',
      'date',
      'category',
      'categoryLabel',
      'tags',
    )
    .all(),
)

const articleItems = computed<ArticleSummary[]>(() =>
  (articles.value ?? []).map(article => ({
    path: article.path,
    title: article.title,
    description: article.description,
    date: article.date,
    category: article.category,
    categoryLabel: article.categoryLabel,
    tags: article.tags ?? [],
  })),
)

const {
  selectedCategory,
  filteredArticles,
  setCategory,
  resetFilters,
} = useArticleFilters(articleItems)

function readQueryValue(value: unknown): string | null {
  if (typeof value === 'string') {
    return value || null
  }

  if (Array.isArray(value)) {
    return value.find((item): item is string =>
      typeof item === 'string' && item.length > 0,
    ) ?? null
  }

  return null
}

function isCanonicalQueryValue(value: unknown, expected: string | null) {
  if (expected === null) {
    return value === undefined
  }

  return typeof value === 'string' && value === expected
}

let pendingReplacement: string | null = null

function syncRouteFromFilters() {
  const category = selectedCategory.value

  if (isCanonicalQueryValue(route.query.category, category) && route.query.tag === undefined) {
    return
  }

  const query = { ...route.query }

  if (category) {
    query.category = category
  }
  else {
    delete query.category
  }

  delete query.tag

  const replacementKey = JSON.stringify(query)

  if (pendingReplacement === replacementKey) {
    return
  }

  pendingReplacement = replacementKey
  void router.replace({ query })
    .catch((error: unknown) => {
      console.error('文章筛选 URL 同步失败', error)
    })
    .finally(() => {
      if (pendingReplacement === replacementKey) {
        pendingReplacement = null
      }
    })
}

watch(selectedCategory, syncRouteFromFilters)

watch(
  () => route.query,
  (query) => {
    setCategory(readQueryValue(query.category))
    syncRouteFromFilters()
  },
  { deep: true, immediate: true },
)

useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  ogTitle: seoTitle,
  ogDescription: seoDescription,
  ogType: 'website',
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
})
</script>

<template>
  <div class="articles-page">
    <AppHeader />

    <main>
      <ArticleFilters
        :selected-category="selectedCategory"
        @select-category="setCategory"
      />

      <ArticleList
        :articles="filteredArticles"
        @reset="resetFilters"
      />
    </main>
  </div>
</template>
