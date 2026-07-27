import { describe, expect, it } from 'vitest'

import {
  articleCategories,
  findCategoryByLegacyPath,
  getCategoryLabel,
} from '../../app/utils/article-taxonomy'

describe('article taxonomy', () => {
  it.each([
    ['accumulate/vue', 'vue', 'Vue'],
    ['accumulate/js', 'javascript', 'JavaScript'],
    ['accumulate/css', 'css', 'CSS'],
    ['accumulate/tool', 'tools', '工具'],
    ['accumulate/buildTool', 'engineering', '工程化'],
    ['accumulate/periphery', 'periphery', '周边技术'],
    ['algorithm', 'algorithm', '简单算法'],
    ['others', 'life', '生活随笔'],
  ])('maps %s to %s', (legacyDirectory, slug, label) => {
    expect(findCategoryByLegacyPath(`${legacyDirectory}/1.md`)).toEqual({
      legacyDirectory,
      slug,
      label,
    })
    expect(getCategoryLabel(slug)).toBe(label)
  })

  it('contains one entry for every supported legacy directory', () => {
    expect(articleCategories).toHaveLength(8)
  })

  it('returns null for an unknown legacy directory', () => {
    expect(findCategoryByLegacyPath('drafts/1.md')).toBeNull()
  })
})
