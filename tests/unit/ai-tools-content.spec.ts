import { readFileSync, readdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const projectRoot = fileURLToPath(new URL('../../', import.meta.url))
const contentDirectory = join(projectRoot, 'content/ai-tools')
const expectedSlugs = [
  'chrome-devtools-mcp',
  'context7',
  'figma-mcp',
  'find-skills',
  'github-mcp',
  'skill-creator',
  'superpowers',
  'taste-skill',
]
const requiredHeadings = [
  '工具是什么',
  '适合哪些场景',
  '安装方式',
  '配置示例',
  '使用示例',
  '注意事项',
  '官方链接',
]

function readField(frontMatter: string, field: string) {
  const match = frontMatter.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'))
  if (!match)
    throw new Error(`缺少 Front Matter 字段：${field}`)
  return JSON.parse(match[1]) as unknown
}

function readTools() {
  return readdirSync(contentDirectory)
    .filter(file => file.endsWith('.md'))
    .map((file) => {
      const source = readFileSync(join(contentDirectory, file), 'utf8')
      const frontMatterMatch = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]+)$/)
      if (!frontMatterMatch)
        throw new Error(`${file} 缺少完整 Front Matter 或正文`)

      const [, frontMatter, body] = frontMatterMatch
      return {
        body,
        file,
        frontMatter,
        slug: basename(file, '.md'),
      }
    })
}

describe('AI 工具内容', () => {
  it('包含 4 个 Skill 和 4 个 MCP，且排序值唯一', () => {
    const tools = readTools()

    expect(tools.map(tool => tool.slug).sort()).toEqual(expectedSlugs)
    expect(tools.filter(tool => readField(tool.frontMatter, 'type') === 'skill')).toHaveLength(4)
    expect(tools.filter(tool => readField(tool.frontMatter, 'type') === 'mcp')).toHaveLength(4)

    const orders = tools.map(tool => readField(tool.frontMatter, 'order'))
    expect(new Set(orders).size).toBe(8)
    expect(orders.every(order => Number.isInteger(order) && Number(order) > 0)).toBe(true)
  })

  it('每篇内容都有合法元数据和完整章节', () => {
    for (const tool of readTools()) {
      expect(readField(tool.frontMatter, 'title')).toBeTypeOf('string')
      expect(readField(tool.frontMatter, 'description')).toBeTypeOf('string')
      expect(readField(tool.frontMatter, 'platforms')).toEqual(expect.any(Array))
      expect(readField(tool.frontMatter, 'tags')).toEqual(expect.any(Array))
      expect(readField(tool.frontMatter, 'officialUrl')).toMatch(/^https:\/\//)

      for (const heading of requiredHeadings)
        expect(tool.body).toContain(`## ${heading}`)

      expect(tool.body).not.toMatch(/(?:ghp_|github_pat_|figd_|sk-)[A-Za-z0-9_-]{12,}/)
      expect(tool.body).not.toContain('未完成标记')
      expect(tool.body).not.toMatch(/(?:^|\n)```[^\n]*\n[ \t]*```[ \t]*(?:\n|$)/)
    }
  })
})
