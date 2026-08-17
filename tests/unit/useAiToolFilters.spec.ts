import { ref } from 'vue'
import { describe, expect, it } from 'vitest'

import { useAiToolFilters } from '../../app/composables/useAiToolFilters'
import type { AiToolSummary } from '../../app/types/ai-tool'

const tools: AiToolSummary[] = [
  {
    path: '/ai-tools/superpowers',
    title: 'Superpowers',
    description: '工程流程',
    type: 'skill',
    order: 1,
    platforms: ['Codex'],
    tags: ['TDD'],
    officialUrl: 'https://example.com/superpowers',
    featured: true,
  },
  {
    path: '/ai-tools/figma-mcp',
    title: 'Figma MCP',
    description: '设计上下文',
    type: 'mcp',
    order: 2,
    platforms: ['Codex'],
    tags: ['Figma'],
    officialUrl: 'https://example.com/figma',
    featured: false,
  },
  {
    path: '/ai-tools/find-skills',
    title: 'Find Skills',
    description: '发现 Skill',
    type: 'skill',
    order: 3,
    platforms: ['Codex'],
    tags: ['发现'],
    officialUrl: 'https://example.com/find-skills',
    featured: false,
  },
]

describe('useAiToolFilters', () => {
  it('默认返回全部工具且不修改输入顺序', () => {
    const source = [...tools]
    const originalPaths = source.map(tool => tool.path)
    const { filteredTools, selectedType } = useAiToolFilters(source)

    expect(selectedType.value).toBeNull()
    expect(filteredTools.value.map(tool => tool.path)).toEqual(originalPaths)
    expect(source.map(tool => tool.path)).toEqual(originalPaths)
  })

  it('按 Skill 或 MCP 类型过滤', () => {
    const { filteredTools, setType } = useAiToolFilters(tools)

    setType('skill')
    expect(filteredTools.value.map(tool => tool.type)).toEqual(['skill', 'skill'])

    setType('mcp')
    expect(filteredTools.value.map(tool => tool.type)).toEqual(['mcp'])
  })

  it('非法值与 null 都恢复全部结果', () => {
    const { filteredTools, selectedType, setType } = useAiToolFilters(tools)

    setType('skill')
    setType('unknown')
    expect(selectedType.value).toBeNull()
    expect(filteredTools.value).toHaveLength(3)

    setType('mcp')
    setType(null)
    expect(selectedType.value).toBeNull()
  })

  it('响应 ref 中的工具更新', () => {
    const source = ref(tools.slice(0, 1))
    const { filteredTools, setType } = useAiToolFilters(source)
    setType('skill')

    source.value = tools
    expect(filteredTools.value.map(tool => tool.path)).toEqual([
      '/ai-tools/superpowers',
      '/ai-tools/find-skills',
    ])
  })
})
