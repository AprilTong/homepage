import { readFileSync } from 'node:fs'

import { describe, expect, it, vi } from 'vitest'

import {
  createArticleRecord,
  parseLegacyArticle,
  rewriteLegacyLinks,
  serializeMigratedArticle,
} from '../../scripts/lib/legacy-content.mjs'
import sharedCategories from '../../shared/article-categories.json'
import { articleCategories } from '../../app/utils/article-taxonomy'

const fixtureRoot = new URL('../fixtures/legacy-content/', import.meta.url)

function readFixture(relativePath: string) {
  return readFileSync(new URL(relativePath, fixtureRoot), 'utf8')
}

describe('legacy content migration', () => {
  it('uses the same category definitions as the frontend taxonomy', () => {
    expect(articleCategories).toEqual(sharedCategories)
  })

  it.each(sharedCategories)(
    'creates a migration record for $legacyDirectory',
    ({ legacyDirectory, slug, label }) => {
      const sourcePath = `${legacyDirectory}/10.md`
      const parsed = parseLegacyArticle(
        '---\ntitle: 分类测试\ndate: 2020-01-01\n---\n正文',
        sourcePath,
      )

      expect(createArticleRecord(parsed)).toMatchObject({
        category: slug,
        categoryLabel: label,
        path: `/articles/${slug}/10`,
        legacyPaths: [
          `/${legacyDirectory}/10.html`,
          `/${legacyDirectory}/10`,
        ],
      })
    },
  )

  it('preserves existing metadata while removing VuePress-only fields', () => {
    const sourcePath = 'accumulate/vue/1.md'
    const parsed = parseLegacyArticle(readFixture(sourcePath), sourcePath)
    const resolveFirstCommitDate = vi.fn(() => {
      throw new Error('existing dates must not consult Git history')
    })

    const record = createArticleRecord(parsed, { resolveFirstCommitDate })

    expect(record).toMatchObject({
      sourcePath,
      title: 'Vue 生命周期',
      date: '2020-01-02',
      tags: ['Vue', 'JavaScript'],
      category: 'vue',
      categoryLabel: 'Vue',
      path: '/articles/vue/1',
      legacyPaths: [
        '/accumulate/vue/1.html',
        '/accumulate/vue/1',
      ],
      description: '这篇文章介绍 Vue 组件从创建到销毁的生命周期。',
    })
    expect(resolveFirstCommitDate).not.toHaveBeenCalled()

    const serialized = serializeMigratedArticle(record)
    const reparsed = parseLegacyArticle(serialized, record.path)

    expect(reparsed.frontmatter).not.toHaveProperty('sidebar')
    expect(reparsed.frontmatter).not.toHaveProperty('sidebarDepth')
    expect(reparsed.frontmatter.title).toBe('Vue 生命周期')
    expect(reparsed.body).toContain('title: 示例文章，不是当前文章')
  })

  it('recovers missing title and date without treating template examples as metadata', () => {
    const sourcePath = 'others/2.md'
    const parsed = parseLegacyArticle(readFixture(sourcePath), sourcePath)
    const resolveFirstCommitDate = vi.fn(() => '2018-08-09')

    const record = createArticleRecord(parsed, { resolveFirstCommitDate })

    expect(resolveFirstCommitDate).toHaveBeenCalledWith(sourcePath)
    expect(record).toMatchObject({
      title: '夏日散步',
      date: '2018-08-09',
      tags: ['生活'],
      category: 'life',
      categoryLabel: '生活随笔',
      path: '/articles/life/2',
      legacyPaths: [
        '/others/2.html',
        '/others/2',
      ],
      description: '雨后的傍晚很凉快，适合沿着河边慢慢散步。',
    })
    expect(record.title).not.toContain('模板标题')
  })

  it('preserves comment markers and escaped quotes inside a quoted title', () => {
    const sourcePath = 'accumulate/vue/6.md'
    const parsed = parseLegacyArticle(
      '---\ntitle: "A # B, \\"C\\""\ndate: 2020-01-01\n---\n正文',
      sourcePath,
    )

    expect(createArticleRecord(parsed).title).toBe('A # B, "C"')
  })

  it('ignores Markdown headings inside HTML comments when recovering a title', () => {
    const sourcePath = 'accumulate/vue/7.md'
    const parsed = parseLegacyArticle([
      '---',
      'date: 2020-01-01',
      '---',
      '<!--',
      '# 模板标题，不是文章标题',
      '-->',
      '# 真实标题',
      '',
      '正文',
    ].join('\n'), sourcePath)

    expect(createArticleRecord(parsed).title).toBe('真实标题')
  })

  it.each([
    { level: 'H1', underline: '===' },
    { level: 'H2', underline: '---' },
  ])('recovers a missing title from a Setext $level heading', ({
    underline,
  }) => {
    const sourcePath = 'accumulate/vue/8.md'
    const parsed = parseLegacyArticle([
      '---',
      'date: 2020-01-01',
      '---',
      'Setext 文章标题',
      underline,
      '',
      '正文',
    ].join('\n'), sourcePath)

    expect(createArticleRecord(parsed).title).toBe('Setext 文章标题')
  })

  it('recovers a missing title from a multiline Setext heading', () => {
    const sourcePath = 'accumulate/vue/8.md'
    const parsed = parseLegacyArticle([
      '---',
      'date: 2020-01-01',
      '---',
      '多行',
      'Setext 文章标题',
      '===',
      '',
      '正文',
    ].join('\n'), sourcePath)

    expect(createArticleRecord(parsed).title).toBe('多行 Setext 文章标题')
  })

  it('ignores an HTML comment opener inside fenced code when finding a title', () => {
    const sourcePath = 'accumulate/vue/8.md'
    const parsed = parseLegacyArticle([
      '---',
      'date: 2020-01-01',
      '---',
      '```html',
      '<!--',
      '```',
      '',
      '真实 Setext 标题',
      '===',
      '',
      '正文',
    ].join('\n'), sourcePath)

    expect(createArticleRecord(parsed).title).toBe('真实 Setext 标题')
  })

  it.each([
    {
      area: 'indented code',
      protectedLines: [
        '    缩进代码标题',
        '---',
      ],
    },
    {
      area: 'container fence',
      protectedLines: [
        '> ```md',
        '> 围栏内标题',
        '> ---',
        '> ```',
      ],
    },
    {
      area: 'HTML comment',
      protectedLines: [
        '<!--',
        '注释内标题',
        '---',
        '-->',
      ],
    },
  ])('ignores Setext-like text inside $area', ({ protectedLines }) => {
    const sourcePath = 'accumulate/vue/9.md'
    const parsed = parseLegacyArticle([
      '---',
      'date: 2020-01-01',
      '---',
      ...protectedLines,
      '',
      '真实 Setext 标题',
      '---',
      '',
      '正文',
    ].join('\n'), sourcePath)

    expect(createArticleRecord(parsed).title).toBe('真实 Setext 标题')
  })

  it('serializes only normalized article fields in frontmatter', () => {
    const sourcePath = 'others/2.md'
    const record = createArticleRecord(
      parseLegacyArticle(readFixture(sourcePath), sourcePath),
      { resolveFirstCommitDate: () => '2018-08-09' },
    )

    const serialized = serializeMigratedArticle(record)
    const parsed = parseLegacyArticle(serialized, record.path)

    expect(parsed.frontmatter).toEqual({
      title: '夏日散步',
      description: '雨后的傍晚很凉快，适合沿着河边慢慢散步。',
      date: '2018-08-09',
      category: 'life',
      categoryLabel: '生活随笔',
      tags: ['生活'],
      legacyPaths: ['/others/2.html', '/others/2'],
      draft: false,
    })
    expect(parsed.body).toContain('<h1>模板标题，不是文章标题</h1>')
  })

  it('rewrites known article links but leaves fenced and inline code unchanged', () => {
    const markdown = [
      '[旧文章](/accumulate/vue/1.html)',
      '',
      '`[内联示例](/accumulate/vue/1.html)`',
      '',
      '```md',
      '[代码示例](/accumulate/vue/1.html)',
      '```',
      '',
      '```md',
      '```js',
      '[带 info string 的围栏行不是闭合围栏](/accumulate/vue/1.html)',
      '```',
      '',
      '<!--',
      '[注释中的链接示例](/accumulate/vue/1.html)',
      '-->',
    ].join('\n')
    const manifest = [{
      path: '/articles/vue/1',
      legacyPaths: ['/accumulate/vue/1.html', '/accumulate/vue/1'],
    }]

    expect(rewriteLegacyLinks(markdown, manifest)).toBe([
      '[旧文章](/articles/vue/1)',
      '',
      '`[内联示例](/accumulate/vue/1.html)`',
      '',
      '```md',
      '[代码示例](/accumulate/vue/1.html)',
      '```',
      '',
      '```md',
      '```js',
      '[带 info string 的围栏行不是闭合围栏](/accumulate/vue/1.html)',
      '```',
      '',
      '<!--',
      '[注释中的链接示例](/accumulate/vue/1.html)',
      '-->',
    ].join('\n'))
  })

  it('resolves relative article links from the legacy source directory', () => {
    const markdown = [
      '[同目录文章](./2.html)',
      '[相邻分类文章](../js/2.html?from=legacy#usage)',
      '[越出站点根](../../../secret.html)',
      '[无效 URL](./%zz.html)',
      '[无效绝对 URL](/accumulate/vue/%zz.html)',
      '',
      '```md',
      '[代码围栏内](./2.html?from=example#usage)',
      '```',
    ].join('\n')
    const manifest = [
      {
        path: '/articles/vue/2',
        legacyPaths: ['/accumulate/vue/2.html', '/accumulate/vue/2'],
      },
      {
        path: '/articles/javascript/2',
        legacyPaths: ['/accumulate/js/2.html', '/accumulate/js/2'],
      },
      {
        path: '/articles/secret',
        legacyPaths: ['/secret.html'],
      },
      {
        path: '/articles/invalid',
        legacyPaths: ['/accumulate/vue/%zz.html'],
      },
    ]

    expect(rewriteLegacyLinks(
      markdown,
      manifest,
      'accumulate/vue/1.md',
    )).toBe([
      '[同目录文章](/articles/vue/2)',
      '[相邻分类文章](/articles/javascript/2?from=legacy#usage)',
      '[越出站点根](../../../secret.html)',
      '[无效 URL](./%zz.html)',
      '[无效绝对 URL](/accumulate/vue/%zz.html)',
      '',
      '```md',
      '[代码围栏内](./2.html?from=example#usage)',
      '```',
    ].join('\n'))
  })

  it('rewrites only AST link destinations while preserving Markdown syntax', () => {
    const markdown = [
      '[行内链接](./2.html "保留标题")',
      '[尖括号链接](<./2.html> "保留标题")',
      '![图片不改](./2.html)',
      '[引用链接][js-entry]',
      '[转义括号](./3\\).html)',
      '[协议相对外链](//accumulate/vue/2.html)',
      '',
      '[js-entry]: ../js/2.html "保留标题"',
    ].join('\n')
    const manifest = [
      {
        path: '/articles/vue/2',
        legacyPaths: ['/accumulate/vue/2.html', '/accumulate/vue/2'],
      },
      {
        path: '/articles/vue/escaped',
        legacyPaths: ['/accumulate/vue/3).html'],
      },
      {
        path: '/articles/javascript/2',
        legacyPaths: ['/accumulate/js/2.html', '/accumulate/js/2'],
      },
    ]

    expect(rewriteLegacyLinks(
      markdown,
      manifest,
      'accumulate/vue/1.md',
    )).toBe([
      '[行内链接](/articles/vue/2 "保留标题")',
      '[尖括号链接](</articles/vue/2> "保留标题")',
      '![图片不改](./2.html)',
      '[引用链接][js-entry]',
      '[转义括号](/articles/vue/escaped)',
      '[协议相对外链](//accumulate/vue/2.html)',
      '',
      '[js-entry]: /articles/javascript/2 "保留标题"',
    ].join('\n'))
  })

  it.each([
    {
      usage: 'reference image',
      markdown: [
        '![图片][asset]',
        '',
        '[asset]: ./2.html',
      ].join('\n'),
    },
    {
      usage: 'shared link and image reference',
      markdown: [
        '[文章][asset]',
        '![图片][asset]',
        '',
        '[asset]: ./2.html',
      ].join('\n'),
    },
  ])('does not rewrite a definition used by $usage', ({ markdown }) => {
    const manifest = [{
      path: '/articles/vue/2',
      legacyPaths: ['/accumulate/vue/2.html', '/accumulate/vue/2'],
    }]

    expect(rewriteLegacyLinks(
      markdown,
      manifest,
      'accumulate/vue/1.md',
    )).toBe(markdown)
  })

  it('preserves CRLF while replacing a link destination', () => {
    const markdown = [
      '[旧链接](./2.html)',
      '',
      '下一段正文',
    ].join('\r\n')
    const manifest = [{
      path: '/articles/vue/2',
      legacyPaths: ['/accumulate/vue/2.html', '/accumulate/vue/2'],
    }]

    expect(rewriteLegacyLinks(
      markdown,
      manifest,
      'accumulate/vue/1.md',
    )).toBe([
      '[旧链接](/articles/vue/2)',
      '',
      '下一段正文',
    ].join('\r\n'))
  })

  it.each([
    {
      area: 'unclosed backtick',
      markdown: [
        '`未闭合 backtick',
        '[普通链接](./2.html)',
      ].join('\n'),
      expected: [
        '`未闭合 backtick',
        '[普通链接](/articles/vue/2)',
      ].join('\n'),
    },
    {
      area: 'escaped backtick',
      markdown: [
        '\\`已转义 backtick',
        '[普通链接](./2.html)',
      ].join('\n'),
      expected: [
        '\\`已转义 backtick',
        '[普通链接](/articles/vue/2)',
      ].join('\n'),
    },
    {
      area: 'HTML comment text inside inline code',
      markdown: [
        '`<!--`',
        '[普通链接](./2.html)',
      ].join('\n'),
      expected: [
        '`<!--`',
        '[普通链接](/articles/vue/2)',
      ].join('\n'),
    },
    {
      area: 'wide ordered-list fence scope',
      markdown: [
        '10. ```md',
        '    [围栏内](./2.html)',
        '    ```',
        '[普通链接](./2.html)',
      ].join('\n'),
      expected: [
        '10. ```md',
        '    [围栏内](./2.html)',
        '    ```',
        '[普通链接](/articles/vue/2)',
      ].join('\n'),
    },
    {
      area: 'blockquote fence scope',
      markdown: [
        '> ```md',
        '> [围栏内](./2.html)',
        '> ```',
        '[普通链接](./2.html)',
      ].join('\n'),
      expected: [
        '> ```md',
        '> [围栏内](./2.html)',
        '> ```',
        '[普通链接](/articles/vue/2)',
      ].join('\n'),
    },
    {
      area: 'four-space paragraph continuation',
      markdown: [
        '段落正文',
        '    [普通链接](./2.html)',
      ].join('\n'),
      expected: [
        '段落正文',
        '    [普通链接](/articles/vue/2)',
      ].join('\n'),
    },
  ])('rewrites ordinary links around $area', ({ markdown, expected }) => {
    const manifest = [{
      path: '/articles/vue/2',
      legacyPaths: ['/accumulate/vue/2.html', '/accumulate/vue/2'],
    }]

    expect(rewriteLegacyLinks(
      markdown,
      manifest,
      'accumulate/vue/1.md',
    )).toBe(expected)
  })

  it('does not rewrite links in four-space indented code', () => {
    const markdown = [
      '[普通段落](./2.html)',
      '',
      '    [四空格缩进代码](./2.html)',
    ].join('\n')
    const manifest = [{
      path: '/articles/vue/2',
      legacyPaths: ['/accumulate/vue/2.html', '/accumulate/vue/2'],
    }]

    expect(rewriteLegacyLinks(
      markdown,
      manifest,
      'accumulate/vue/1.md',
    )).toBe([
      '[普通段落](/articles/vue/2)',
      '',
      '    [四空格缩进代码](./2.html)',
    ].join('\n'))
  })

  it.each([
    {
      container: 'list',
      lines: [
        '- ```md',
        '  [列表容器内](./2.html)',
        '  ```',
      ],
    },
    {
      container: 'blockquote',
      lines: [
        '> ```md',
        '> [引用容器内](./2.html)',
        '> ```',
      ],
    },
  ])('does not rewrite links in $container container fences', ({ lines }) => {
    const markdown = lines.join('\n')
    const manifest = [{
      path: '/articles/vue/2',
      legacyPaths: ['/accumulate/vue/2.html', '/accumulate/vue/2'],
    }]

    expect(rewriteLegacyLinks(
      markdown,
      manifest,
      'accumulate/vue/1.md',
    )).toBe(markdown)
  })

  it('does not rewrite links in a multiline code span', () => {
    const markdown = [
      '`跨行 code span 开始',
      '[跨行 code span 内](./2.html)',
      'code span 结束`',
    ].join('\n')
    const manifest = [{
      path: '/articles/vue/2',
      legacyPaths: ['/accumulate/vue/2.html', '/accumulate/vue/2'],
    }]

    expect(rewriteLegacyLinks(
      markdown,
      manifest,
      'accumulate/vue/1.md',
    )).toBe(markdown)
  })

  it.each([
    {
      sourcePath: 'drafts/3.md',
      source: '---\ntitle: 草稿\ndate: 2020-01-01\n---\n正文',
      options: {},
    },
    {
      sourcePath: 'accumulate/vue/3.md',
      source: '---\ndate: 2020-01-01\n---\n',
      options: {},
    },
    {
      sourcePath: 'accumulate/vue/4.md',
      source: '---\ntitle: 缺少日期\n---\n正文',
      options: { resolveFirstCommitDate: () => null },
    },
  ])('includes $sourcePath when required metadata cannot be recovered', ({
    sourcePath,
    source,
    options,
  }) => {
    const parsed = parseLegacyArticle(source, sourcePath)

    expect(() => createArticleRecord(parsed, options))
      .toThrow(new RegExp(sourcePath.replaceAll('/', '\\/')))
  })

  it('adds the source path when commit-date resolution fails', () => {
    const sourcePath = 'accumulate/vue/5.md'
    const parsed = parseLegacyArticle(
      '---\ntitle: Git 日期失败\n---\n正文',
      sourcePath,
    )

    expect(() => createArticleRecord(parsed, {
      resolveFirstCommitDate() {
        throw new Error('git log failed')
      },
    })).toThrow(/accumulate\/vue\/5\.md: git log failed/)
  })
})
