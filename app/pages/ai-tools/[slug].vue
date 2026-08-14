<script setup lang="ts">
import AiToolSidebar from '~/components/ai-tools/AiToolSidebar.vue'
import type { AiToolSummary } from '~/types/ai-tool'

const route = useRoute()
const { data: detailData, error: detailError } = await useAsyncData(
  `ai-tool-detail:${route.path}`,
  async () => {
    const tool = await queryCollection('aiTools')
      .where('draft', '=', false)
      .path(route.path)
      .first()

    if (!tool)
      return { relatedTools: [], tool: null }

    const relatedTools = await queryCollection('aiTools')
      .where('draft', '=', false)
      .where('type', '=', tool.type)
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
      .all()

    return { relatedTools, tool }
  },
)

if (detailError.value)
  throw detailError.value

const tool = detailData.value?.tool
if (!tool) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Not Found',
    message: 'AI 工具不存在',
  })
}

const relatedTools = (detailData.value?.relatedTools ?? [])
  .filter(item => item.path !== tool.path)
  .slice(0, 3) as AiToolSummary[]
const typeLabel = tool.type === 'skill' ? 'Skill' : 'MCP'
const canonicalUrl = `https://blog.april-tong.cn${tool.path}`
const pageTitle = `${tool.title}｜AI 工具箱｜April 的技术笔记`

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
  '@type': 'SoftwareApplication',
  name: tool.title,
  description: tool.description,
  applicationCategory: 'DeveloperApplication',
  url: tool.officialUrl,
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': canonicalUrl,
  },
})

useSeoMeta({
  title: pageTitle,
  description: tool.description,
  ogTitle: tool.title,
  ogDescription: tool.description,
  ogType: 'website',
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [{
    id: 'ai-tool-json-ld',
    type: 'application/ld+json',
    innerHTML: jsonLd,
  }],
})
</script>

<template>
  <div class="ai-tool-detail-page">
    <AppHeader />

    <main v-if="tool" aria-labelledby="ai-tool-title">
      <NuxtLink to="/ai-tools" class="ai-tool-detail__back" data-testid="back-to-ai-tools">
        ← 返回 AI 工具列表
      </NuxtLink>

      <div class="ai-tool-detail__layout">
        <article class="ai-tool-reader">
          <header class="ai-tool-detail__header">
            <p class="ai-tool-detail__eyebrow" data-testid="ai-tool-type">{{ typeLabel }}</p>
            <h1 id="ai-tool-title">{{ tool.title }}</h1>
            <p class="ai-tool-detail__description">{{ tool.description }}</p>

            <div class="ai-tool-detail__metadata">
              <ul aria-label="支持平台">
                <li
                  v-for="platform in tool.platforms"
                  :key="platform"
                  data-testid="ai-tool-platform"
                >{{ platform }}</li>
              </ul>
              <ul aria-label="用途标签">
                <li v-for="tag in tool.tags" :key="tag" data-testid="ai-tool-tag">{{ tag }}</li>
              </ul>
            </div>
          </header>

          <p class="ai-tool-detail__notice">
            执行命令前，请先查看官方链接，确认客户端版本、权限范围和最新配置格式。
          </p>

          <ContentRenderer :value="tool" class="ai-tool-prose" />

          <section v-if="relatedTools.length" class="ai-tool-recommendations">
            <h2>同类型工具</h2>
            <ol>
              <li v-for="related in relatedTools" :key="related.path">
                <article class="ai-tool-card ai-tool-card--compact">
                  <h3>{{ related.title }}</h3>
                  <p>{{ related.description }}</p>
                  <NuxtLink :to="related.path">查看详情</NuxtLink>
                </article>
              </li>
            </ol>
          </section>
        </article>

        <AiToolSidebar
          :official-url="tool.officialUrl"
          :repository-url="tool.repositoryUrl"
          :links="tool.body?.toc?.links"
        />
      </div>
    </main>
  </div>
</template>
