import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue'

import type { AiToolFilter, AiToolSummary } from '../types/ai-tool'

export function useAiToolFilters(tools: MaybeRefOrGetter<readonly AiToolSummary[]>) {
  const selectedType = ref<AiToolFilter>(null)

  const filteredTools = computed(() => {
    const items = toValue(tools)
    if (!selectedType.value)
      return [...items]
    return items.filter(tool => tool.type === selectedType.value)
  })

  function setType(value: unknown) {
    selectedType.value = value === 'skill' || value === 'mcp' ? value : null
  }

  return {
    filteredTools,
    selectedType,
    setType,
  }
}
