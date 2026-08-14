<script setup lang="ts">
import type { AiToolFilter, AiToolType } from '~/types/ai-tool'

defineProps<{
  selectedType: AiToolFilter
}>()

const emit = defineEmits<{
  'select-type': [type: AiToolFilter]
}>()

const options: Array<{ label: string, value: AiToolType }> = [
  { label: 'Skills', value: 'skill' },
  { label: 'MCP', value: 'mcp' },
]
</script>

<template>
  <section class="ai-tool-filters" aria-label="AI 工具筛选">
    <div role="group" aria-label="按工具类型筛选">
      <button
        type="button"
        data-type=""
        :aria-pressed="selectedType === null"
        @click="emit('select-type', null)"
      >
        全部
      </button>
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        :data-type="option.value"
        :aria-pressed="selectedType === option.value"
        @click="emit('select-type', option.value)"
      >
        {{ option.label }}
      </button>
    </div>
  </section>
</template>
