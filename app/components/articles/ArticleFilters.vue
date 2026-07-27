<script setup lang="ts">
import { articleCategories } from '~/utils/article-taxonomy'

defineProps<{
  selectedCategory: string | null
}>()

const emit = defineEmits<{
  'select-category': [category: string | null]
}>()
</script>

<template>
  <section class="article-filters" aria-label="文章筛选">
    <div role="group" aria-label="按分类筛选">
      <button
        type="button"
        data-category=""
        :aria-pressed="selectedCategory === null"
        @click="emit('select-category', null)"
      >
        全部
      </button>
      <button
        v-for="category in articleCategories"
        :key="category.slug"
        type="button"
        :data-category="category.slug"
        :aria-pressed="selectedCategory === category.slug"
        @click="emit('select-category', category.slug)"
      >
        {{ category.label }}
      </button>
    </div>

  </section>
</template>
