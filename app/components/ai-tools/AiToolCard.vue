<script setup lang="ts">
import type { AiToolSummary } from '~/types/ai-tool'

const props = defineProps<{
  tool: AiToolSummary
}>()

const typeLabel = computed(() => props.tool.type === 'skill' ? 'Skill' : 'MCP')
const visibleTags = computed(() => props.tool.tags.slice(0, 3))
const visiblePlatforms = computed(() => props.tool.platforms.slice(0, 3).join(' · '))
</script>

<template>
  <article class="ai-tool-card">
    <div class="ai-tool-card__meta">
      <span class="ai-tool-card__type" data-testid="tool-type">{{ typeLabel }}</span>
      <span v-if="tool.featured" class="ai-tool-card__featured" data-testid="tool-featured">
        推荐
      </span>
    </div>

    <h2>{{ tool.title }}</h2>
    <p class="ai-tool-card__description">{{ tool.description }}</p>

    <ul v-if="visibleTags.length" class="ai-tool-card__tags" aria-label="用途标签">
      <li v-for="tag in visibleTags" :key="tag" data-testid="tool-tag">{{ tag }}</li>
    </ul>

    <p class="ai-tool-card__platforms" data-testid="tool-platforms">
      {{ visiblePlatforms }}
    </p>

    <NuxtLink :to="tool.path" class="ai-tool-card__link">
      查看详情
    </NuxtLink>
  </article>
</template>
