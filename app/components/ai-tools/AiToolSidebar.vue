<script setup lang="ts">
import ArticleToc from '~/components/articles/ArticleToc.vue'

interface TocLink {
  id: string
  depth: number
  text: string
  children?: TocLink[]
}

const props = defineProps<{
  officialUrl: string
  repositoryUrl?: string
  links?: TocLink[]
}>()

const showRepository = computed(() =>
  Boolean(props.repositoryUrl && props.repositoryUrl !== props.officialUrl),
)
</script>

<template>
  <aside class="ai-tool-sidebar" aria-label="工具信息">
    <section class="ai-tool-sidebar__links">
      <h2>相关链接</h2>
      <a :href="officialUrl" target="_blank" rel="noreferrer">官方文档 ↗</a>
      <a
        v-if="showRepository"
        :href="repositoryUrl"
        target="_blank"
        rel="noreferrer"
      >源码仓库 ↗</a>
    </section>
    <ArticleToc :links="links" />
  </aside>
</template>
