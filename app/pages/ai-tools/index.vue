<script setup lang="ts">
import AiToolFilters from '~/components/ai-tools/AiToolFilters.vue'
import AiToolHero from '~/components/ai-tools/AiToolHero.vue'
import AiToolList from '~/components/ai-tools/AiToolList.vue'
import type { AiToolFilter, AiToolSummary } from '~/types/ai-tool'

const canonicalUrl = 'https://blog.april-tong.cn/ai-tools'
const seoTitle = 'AI 工具箱｜April 的技术笔记'
const seoDescription = '整理常用的 Agent Skills 与 MCP，提供作用介绍、安装配置和使用示例。'
const route = useRoute()
const router = useRouter()

const { data: tools } = await useAsyncData('ai-tools-index', () =>
  queryCollection('aiTools')
    .where('draft', '=', false)
    .order('order', 'ASC')
    .order('title', 'ASC')
    .select(
      'path',
      'title',
      'description',
      'type',
      'order',
      'platforms',
      'tags',
      'officialUrl',
      'repositoryUrl',
      'featured',
    )
    .all(),
)

const toolItems = computed<AiToolSummary[]>(() =>
  (tools.value ?? []).map(tool => ({
    path: tool.path,
    title: tool.title,
    description: tool.description,
    type: tool.type,
    order: tool.order,
    platforms: tool.platforms ?? [],
    tags: tool.tags ?? [],
    officialUrl: tool.officialUrl,
    repositoryUrl: tool.repositoryUrl,
    featured: tool.featured,
  })),
)
const skillCount = computed(() => toolItems.value.filter(tool => tool.type === 'skill').length)
const mcpCount = computed(() => toolItems.value.filter(tool => tool.type === 'mcp').length)
const { filteredTools, selectedType, setType } = useAiToolFilters(toolItems)

function readType(value: unknown): AiToolFilter {
  return value === 'skill' || value === 'mcp' ? value : null
}

function isCanonicalType(value: unknown, expected: AiToolFilter) {
  return expected === null ? value === undefined : value === expected
}

let pendingReplacement: string | null = null

function syncRouteFromFilter() {
  const type = selectedType.value
  if (isCanonicalType(route.query.type, type))
    return

  const query = { ...route.query }
  if (type)
    query.type = type
  else
    delete query.type

  const replacementKey = JSON.stringify(query)
  if (pendingReplacement === replacementKey)
    return

  pendingReplacement = replacementKey
  void router.replace({ query })
    .catch((error: unknown) => {
      console.error('AI 工具筛选 URL 同步失败', error)
    })
    .finally(() => {
      if (pendingReplacement === replacementKey)
        pendingReplacement = null
    })
}

watch(selectedType, syncRouteFromFilter)
watch(
  () => route.query,
  (query) => {
    setType(readType(query.type))
    syncRouteFromFilter()
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
  <div class="ai-tools-page">
    <AppHeader />

    <main aria-labelledby="ai-tools-title">
      <AiToolHero
        :total="toolItems.length"
        :skill-count="skillCount"
        :mcp-count="mcpCount"
      />
      <AiToolFilters
        :selected-type="selectedType"
        @select-type="setType"
      />
      <p class="sr-only" aria-live="polite">
        当前显示 {{ filteredTools.length }} 个 AI 工具
      </p>
      <AiToolList :tools="filteredTools" @reset="setType(null)" />
    </main>
  </div>
</template>
