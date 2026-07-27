<script setup lang="ts">
import ArticleToc from '~/components/articles/ArticleToc.vue'

const route = useRoute()
const { data: detailData, error: detailError } = await useAsyncData(
  `article-detail:${route.path}`,
  async () => {
    const article = await queryCollection('articles')
      .where('draft', '=', false)
      .path(route.path)
      .first()

    if (!article) {
      return {
        article: null,
        navigationArticles: [],
      }
    }

    const navigationArticles = await queryCollection('articles')
      .where('draft', '=', false)
      .order('date', 'DESC')
      .order('path', 'ASC')
      .select('path', 'title', 'date', 'category', 'categoryLabel')
      .all()

    return {
      article,
      navigationArticles,
    }
  },
)

if (detailError.value) {
  throw detailError.value
}

const article = detailData.value?.article
const navigationArticles = detailData.value?.navigationArticles ?? []

if (!article) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Not Found',
    message: '文章不存在',
  })
}

const currentIndex = navigationArticles.findIndex(item => item.path === article.path)
const previousArticle = currentIndex > 0
  ? navigationArticles[currentIndex - 1]
  : undefined
const nextArticle = currentIndex >= 0 && currentIndex < navigationArticles.length - 1
  ? navigationArticles[currentIndex + 1]
  : undefined

const canonicalUrl = `https://blog.april-tong.cn${article.path}`
const pageTitle = `${article.title}｜April 的技术笔记`

function serializeJsonLd(value: unknown) {
  const unsafeCharacters: Record<string, string> = {
    '<': '\\u003C',
    '>': '\\u003E',
    '&': '\\u0026',
    '\u2028': '\\u2028',
    '\u2029': '\\u2029',
  }

  return JSON.stringify(value).replace(
    /[<>&\u2028\u2029]/gu,
    character => unsafeCharacters[character] ?? character,
  )
}

const jsonLd = serializeJsonLd({
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: article.title,
  description: article.description,
  datePublished: article.date,
  author: {
    '@type': 'Person',
    name: 'AprilTong',
  },
  url: canonicalUrl,
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': canonicalUrl,
  },
})

useSeoMeta({
  title: pageTitle,
  description: article.description,
  ogTitle: article.title,
  ogDescription: article.description,
  ogType: 'article',
  articlePublishedTime: article.date,
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      id: 'article-json-ld',
      type: 'application/ld+json',
      innerHTML: jsonLd,
    },
  ],
})
</script>

<template>
  <div class="article-detail-page">
    <AppHeader />

    <main v-if="article" aria-labelledby="article-title">
      <NuxtLink
        to="/articles"
        class="article-detail__back"
        data-testid="back-to-articles"
      >
        ← 返回文章列表
      </NuxtLink>

      <div class="article-detail__layout">
        <article class="article-reader">
          <header class="article-detail__header">
            <p class="article-detail__eyebrow">APRIL / ARTICLE</p>
            <h1 id="article-title">{{ article.title }}</h1>

            <div class="article-detail__meta">
              <time :datetime="article.date">{{ article.date }}</time>
              <span data-testid="article-category">{{ article.categoryLabel }}</span>
            </div>

            <ul
              v-if="article.tags?.length"
              class="article-detail__tags"
              aria-label="文章标签"
            >
              <li
                v-for="tag in article.tags ?? []"
                :key="tag"
                data-testid="article-tag"
              >
                {{ tag }}
              </li>
            </ul>
          </header>

          <ContentRenderer
            :value="article"
            class="article-prose"
          />

          <nav
            v-if="previousArticle || nextArticle"
            class="article-neighbors"
            aria-label="相邻文章"
          >
            <NuxtLink
              v-if="previousArticle"
              :to="previousArticle.path"
              class="article-neighbors__previous"
              rel="prev"
            >
              上一篇：{{ previousArticle.title }}
            </NuxtLink>
            <NuxtLink
              v-if="nextArticle"
              :to="nextArticle.path"
              class="article-neighbors__next"
              rel="next"
            >
              下一篇：{{ nextArticle.title }}
            </NuxtLink>
          </nav>
        </article>

        <aside class="article-detail__aside">
          <ArticleToc :links="article.body?.toc?.links" />
        </aside>
      </div>
    </main>
  </div>
</template>
