import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it } from 'vitest'

import AiToolFilters from '~/components/ai-tools/AiToolFilters.vue'

const wrappers = new Set<{ unmount: () => void }>()

afterEach(() => {
  for (const wrapper of wrappers)
    wrapper.unmount()
  wrappers.clear()
})

async function mountFilters(selectedType: 'skill' | 'mcp' | null = null) {
  const wrapper = await mountSuspended(AiToolFilters, {
    props: { selectedType },
  })
  wrappers.add(wrapper)
  return wrapper
}

describe('AiToolFilters', () => {
  it('展示全部、Skills 和 MCP 三个筛选按钮', async () => {
    const wrapper = await mountFilters()
    const section = wrapper.get('section.ai-tool-filters')
    const buttons = section.get('[role="group"]').findAll('button')

    expect(section.attributes('aria-label')).toBe('AI 工具筛选')
    expect(buttons.map(button => button.text())).toEqual(['全部', 'Skills', 'MCP'])
    expect(buttons.map(button => button.attributes('data-type'))).toEqual(['', 'skill', 'mcp'])
  })

  it('暴露当前状态并发出选择事件', async () => {
    const wrapper = await mountFilters('skill')

    expect(wrapper.get('button[data-type="skill"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('button[data-type="mcp"]').attributes('aria-pressed')).toBe('false')

    await wrapper.get('button[data-type="mcp"]').trigger('click')
    await wrapper.get('button[data-type=""]').trigger('click')

    expect(wrapper.emitted('select-type')).toEqual([['mcp'], [null]])
  })
})
