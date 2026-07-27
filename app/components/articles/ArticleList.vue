<script setup lang="ts">
import type { ArticleSummary } from '~/types/article'

defineProps<{
  articles: readonly ArticleSummary[]
}>()

const emit = defineEmits<{
  reset: []
}>()
</script>

<template>
  <ol
    v-if="articles.length > 0"
    class="article-list"
    aria-label="文章列表"
  >
    <li
      v-for="article in articles"
      :key="article.path"
    >
      <article class="article-card">
        <div class="article-card__meta">
          <time :datetime="article.date">{{ article.date }}</time>
          <span
            class="article-card__category"
            data-testid="article-category"
          >
            {{ article.categoryLabel }}
          </span>
        </div>

        <h2>
          <NuxtLink
            :to="article.path"
            :title="article.title"
          >
            {{ article.title }}
          </NuxtLink>
        </h2>

        <p>{{ article.description }}</p>
      </article>
    </li>
  </ol>

  <div
    v-else
    class="article-list-empty"
    data-testid="article-empty-state"
  >
    <p role="status">没有找到符合条件的文章。</p>
    <button type="button" @click="emit('reset')">
      重置筛选
    </button>
  </div>
</template>
