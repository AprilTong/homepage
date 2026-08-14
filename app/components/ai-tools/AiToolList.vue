<script setup lang="ts">
import AiToolCard from './AiToolCard.vue'

import type { AiToolSummary } from '~/types/ai-tool'

defineProps<{
  tools: readonly AiToolSummary[]
}>()

const emit = defineEmits<{
  reset: []
}>()
</script>

<template>
  <ol v-if="tools.length" class="ai-tool-list" aria-label="AI 工具列表">
    <li v-for="tool in tools" :key="tool.path">
      <AiToolCard :tool="tool" />
    </li>
  </ol>

  <div v-else class="ai-tool-list-empty" data-testid="ai-tool-empty-state">
    <p role="status">没有找到符合条件的 AI 工具。</p>
    <button type="button" @click="emit('reset')">查看全部</button>
  </div>
</template>
