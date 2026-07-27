import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { execFileSync, spawnSync } from 'node:child_process'
import { join, relative, sep } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { parseLegacyArticle } from '../../scripts/lib/legacy-content.mjs'
import {
  commitMigrationTransaction,
  createFilledFields,
  migrateLegacyContent,
  validateMigrationPaths,
} from '../../scripts/migrate-legacy-content.mjs'
import categories from '../../shared/article-categories.json'

interface MigrationEntry {
  sourcePath: string
  newPath: string
  title: string
  description: string
  date: string
  category: string
  categoryLabel: string
  legacyPaths: string[]
  missingLocalResources: string[]
  filledFields: {
    title?: 'markdown-heading' | 'manual-override'
    date?: 'git-first-commit'
  }
  sourceHash: string
}

const projectRoot = fileURLToPath(new URL('../../', import.meta.url))
const manifestPath = new URL(
  '../../content/migration-manifest.json',
  import.meta.url,
)
const manifest = JSON.parse(
  readFileSync(manifestPath, 'utf8'),
) as MigrationEntry[]

function outputFile(entry: MigrationEntry) {
  return `${projectRoot}/content${entry.newPath}.md`
}

function expectUnique(values: string[]) {
  expect(new Set(values).size).toBe(values.length)
}

function writeFixture(path: string, value: string) {
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, value, 'utf8')
}

function createVerifierFixture() {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'content-verifier-'))
  cpSync(
    join(projectRoot, 'content'),
    join(fixtureRoot, 'content'),
    { recursive: true },
  )
  writeFixture(
    join(fixtureRoot, 'server/data/legacy-redirects.json'),
    readFileSync(
      join(projectRoot, 'server/data/legacy-redirects.json'),
      'utf8',
    ),
  )
  return fixtureRoot
}

function runVerifier(fixtureRoot: string) {
  const result = spawnSync(
    process.execPath,
    ['scripts/verify-migrated-content.mjs', '--root', fixtureRoot],
    { cwd: projectRoot, encoding: 'utf8' },
  )
  if (result.status !== 0)
    throw new Error(result.stderr.trim())
  return result.stdout
}

function listMarkdownFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory())
      return listMarkdownFiles(path)
    return entry.isFile() && entry.name.endsWith('.md') ? [path] : []
  })
}

function createLegacySourceFixture(
  fixtureRoot: string,
  kind: 'article-symlink' | 'resource-symlink' | 'unsafe-html',
) {
  const sourceRoot = join(fixtureRoot, 'legacy')
  const docsRoot = join(sourceRoot, 'docs')
  const normalArticleCount = kind === 'article-symlink' ? 99 : 100
  let created = 0

  for (let categoryIndex = 0; categoryIndex < categories.length; categoryIndex += 1) {
    const category = categories[categoryIndex]
    const count = categoryIndex === 0
      ? normalArticleCount - (categories.length - 1)
      : 1
    for (let id = 1; id <= count; id += 1) {
      created += 1
      const sourcePath = join(
        docsRoot,
        category.legacyDirectory,
        `${id}.md`,
      )
      const resource = created === 1 && kind === 'resource-symlink'
        ? '\n![secret](./secret.txt)\n'
        : created === 1 && kind === 'unsafe-html'
          ? '\n<script>unsafe()</script>\n'
          : '\n正文\n'
      writeFixture(sourcePath, [
        '---',
        `title: "Fixture ${created}"`,
        'date: "2020-01-01"',
        '---',
        resource,
      ].join('\n'))
    }
  }

  if (kind !== 'unsafe-html') {
    const secretPath = join(fixtureRoot, 'outside-secret.txt')
    writeFixture(secretPath, 'outside secret bytes')
    if (kind === 'article-symlink') {
      symlinkSync(
        secretPath,
        join(docsRoot, categories[0].legacyDirectory, '999.md'),
      )
    }
    else {
      symlinkSync(
        secretPath,
        join(docsRoot, categories[0].legacyDirectory, 'secret.txt'),
      )
    }
  }

  return sourceRoot
}

function writeOldMigrationSnapshot(project: string) {
  const snapshot = {
    article: join(project, 'content/articles/old.md'),
    manifest: join(project, 'content/migration-manifest.json'),
    redirects: join(project, 'server/data/legacy-redirects.json'),
    resource: join(project, 'public/articles/old.txt'),
  }
  for (const [name, path] of Object.entries(snapshot))
    writeFixture(path, `old ${name}`)
  return snapshot
}

describe('migrated legacy content', () => {
  it('records a manual title override with a controlled provenance', () => {
    expect(createFilledFields({
      hadTitle: false,
      usedTitleOverride: true,
      filledDate: false,
    })).toEqual({ title: 'manual-override' })
  })

  it('keeps migration scripts portable and crash residue visible', () => {
    const packageJson = JSON.parse(
      readFileSync(join(projectRoot, 'package.json'), 'utf8'),
    )
    const gitignore = readFileSync(join(projectRoot, '.gitignore'), 'utf8')

    expect(packageJson.scripts['migrate:content']).toBe(
      'node scripts/migrate-legacy-content.mjs --output content/articles',
    )
    expect(packageJson.scripts['migrate:content']).not.toContain('/Users/')
    expect(gitignore).not.toContain('.content-migration-tmp-')
  })

  it('requires a CLI or environment legacy source', () => {
    const env = { ...process.env }
    delete env.LEGACY_BLOG_SOURCE
    const result = spawnSync(
      process.execPath,
      [
        'scripts/migrate-legacy-content.mjs',
        '--output',
        'content/articles',
      ],
      { cwd: projectRoot, env, encoding: 'utf8' },
    )

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain(
      'Provide --source or LEGACY_BLOG_SOURCE',
    )
  })

  it('uses LEGACY_BLOG_SOURCE when --source is absent', () => {
    const missingSource = join(tmpdir(), `missing-legacy-${process.pid}`)
    const result = spawnSync(
      process.execPath,
      [
        'scripts/migrate-legacy-content.mjs',
        '--output',
        'content/articles',
      ],
      {
        cwd: projectRoot,
        env: {
          ...process.env,
          LEGACY_BLOG_SOURCE: missingSource,
        },
        encoding: 'utf8',
      },
    )

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain(missingSource)
    expect(result.stderr).toContain('does not exist')
  })

  it.each([
    { label: 'root', output: '/' },
    { label: 'project escape', output: '../outside' },
  ])('rejects $label as a migration output without changing it', ({
    output,
  }) => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), 'content-path-safety-'))
    const fixtureProject = join(fixtureRoot, 'project')
    const sourceRoot = join(fixtureRoot, 'legacy')
    mkdirSync(join(sourceRoot, 'docs'), { recursive: true })
    const target = output === '/'
      ? join(fixtureRoot, 'root-sentinel')
      : join(fixtureRoot, 'outside')
    writeFixture(target, 'unchanged')

    try {
      expect(() => validateMigrationPaths({
        projectRoot: fixtureProject,
        sourceRoot,
        output,
      })).toThrow('Unsafe migration output')
      expect(readFileSync(target, 'utf8')).toBe('unchanged')
    }
    finally {
      rmSync(fixtureRoot, { recursive: true, force: true })
    }
  })

  it('rejects a symlink ancestor and source/docs overlap', () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), 'content-path-safety-'))
    const sourceRoot = join(fixtureRoot, 'legacy')
    mkdirSync(join(sourceRoot, 'docs'), { recursive: true })

    try {
      const symlinkProject = join(fixtureRoot, 'symlink-project')
      const realContent = join(fixtureRoot, 'real-content')
      mkdirSync(realContent, { recursive: true })
      mkdirSync(symlinkProject, { recursive: true })
      symlinkSync(realContent, join(symlinkProject, 'content'))
      expect(() => validateMigrationPaths({
        projectRoot: symlinkProject,
        sourceRoot,
        output: 'content/articles',
      })).toThrow('symbolic link')

      const overlapProject = join(fixtureRoot, 'overlap-project')
      const overlappingSource = join(
        overlapProject,
        'content/articles/legacy',
      )
      mkdirSync(join(overlappingSource, 'docs'), { recursive: true })
      expect(() => validateMigrationPaths({
        projectRoot: overlapProject,
        sourceRoot: overlappingSource,
        output: 'content/articles',
      })).toThrow('overlaps source/docs')
    }
    finally {
      rmSync(fixtureRoot, { recursive: true, force: true })
    }
  })

  it.each(['absolute', 'parent-relative'])(
    'rejects unsafe CLI output $label before touching target bytes',
    (label) => {
      const fixtureRoot = mkdtempSync(join(tmpdir(), 'content-cli-safety-'))
      const target = label === 'absolute'
        ? join(fixtureRoot, 'existing')
        : join(projectRoot, '..', `outside-${process.pid}`)
      writeFixture(join(target, 'sentinel.txt'), 'unchanged')

      try {
        const output = label === 'absolute'
          ? target
          : `../outside-${process.pid}`
        const result = spawnSync(
          process.execPath,
          [
            'scripts/migrate-legacy-content.mjs',
            '--source',
            join(fixtureRoot, 'missing-source'),
            '--output',
            output,
          ],
          { cwd: projectRoot, encoding: 'utf8' },
        )
        expect(result.status).not.toBe(0)
        expect(result.stderr).toContain('Unsafe migration output')
        expect(readFileSync(join(target, 'sentinel.txt'), 'utf8'))
          .toBe('unchanged')
      }
      finally {
        rmSync(target, { recursive: true, force: true })
        rmSync(fixtureRoot, { recursive: true, force: true })
      }
    },
  )

  it.each(['article-symlink', 'resource-symlink'] as const)(
    'rejects a legacy $kind without changing the old snapshot',
    (kind) => {
      const fixtureRoot = mkdtempSync(join(tmpdir(), 'content-source-safety-'))
      const fixtureProject = join(fixtureRoot, 'project')
      const sourceRoot = createLegacySourceFixture(fixtureRoot, kind)
      const snapshot = writeOldMigrationSnapshot(fixtureProject)

      try {
        expect(() => migrateLegacyContent({
          projectRoot: fixtureProject,
          sourceRoot,
          outputRoot: join(fixtureProject, 'content/articles'),
        })).toThrow('symbolic link')
        for (const [name, path] of Object.entries(snapshot))
          expect(readFileSync(path, 'utf8')).toBe(`old ${name}`)
      }
      finally {
        rmSync(fixtureRoot, { recursive: true, force: true })
      }
    },
  )

  it.each(['existing-target', 'broken-target'])(
    'rejects a $kind symbolic link below public/articles',
    (kind) => {
    const fixtureRoot = createVerifierFixture()
    const secret = join(fixtureRoot, 'outside.txt')
    if (kind === 'existing-target')
      writeFixture(secret, 'outside bytes')
    mkdirSync(join(fixtureRoot, 'public/articles'), { recursive: true })
    symlinkSync(secret, join(fixtureRoot, 'public/articles/link.txt'))

    try {
      expect(() => runVerifier(fixtureRoot)).toThrow('symbolic link')
    }
    finally {
      rmSync(fixtureRoot, { recursive: true, force: true })
    }
    },
  )

  it.each(['content', 'server', 'public'])(
    'rejects a $parent parent-directory symlink',
    (parent) => {
      const fixtureRoot = createVerifierFixture()
      const parentPath = join(fixtureRoot, parent)
      if (parent === 'public')
        mkdirSync(join(parentPath, 'articles'), { recursive: true })
      const externalPath = join(fixtureRoot, `external-${parent}`)
      renameSync(parentPath, externalPath)
      symlinkSync(externalPath, parentPath)

      try {
        expect(() => runVerifier(fixtureRoot))
          .toThrow('symbolic link ancestor')
      }
      finally {
        rmSync(fixtureRoot, { recursive: true, force: true })
      }
    },
  )

  it('rejects unsafe raw HTML during migration staging validation', () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), 'content-html-safety-'))
    const fixtureProject = join(fixtureRoot, 'project')
    const sourceRoot = createLegacySourceFixture(fixtureRoot, 'unsafe-html')
    const snapshot = writeOldMigrationSnapshot(fixtureProject)

    try {
      expect(() => migrateLegacyContent({
        projectRoot: fixtureProject,
        sourceRoot,
        outputRoot: join(fixtureProject, 'content/articles'),
      })).toThrow('unsafe HTML')
      for (const [name, path] of Object.entries(snapshot))
        expect(readFileSync(path, 'utf8')).toBe(`old ${name}`)
    }
    finally {
      rmSync(fixtureRoot, { recursive: true, force: true })
    }
  })

  it('restores every old target when transaction installation fails', () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), 'content-transaction-'))
    const transactionRoot = join(fixtureRoot, '.content-migration-tmp-test')
    const targets = [
      {
        name: 'articles',
        stagedPath: join(transactionRoot, 'staged/content/articles'),
        destinationPath: join(fixtureRoot, 'content/articles'),
        oldFile: 'old.md',
        newFile: 'new.md',
      },
      {
        name: 'manifest',
        stagedPath: join(
          transactionRoot,
          'staged/content/migration-manifest.json',
        ),
        destinationPath: join(
          fixtureRoot,
          'content/migration-manifest.json',
        ),
      },
      {
        name: 'redirects',
        stagedPath: join(
          transactionRoot,
          'staged/server/data/legacy-redirects.json',
        ),
        destinationPath: join(
          fixtureRoot,
          'server/data/legacy-redirects.json',
        ),
      },
      {
        name: 'public',
        stagedPath: join(transactionRoot, 'staged/public/articles'),
        destinationPath: join(fixtureRoot, 'public/articles'),
        oldFile: 'old.png',
        newFile: 'new.png',
      },
    ]

    try {
      for (const target of targets) {
        if (target.oldFile) {
          writeFixture(
            join(target.destinationPath, target.oldFile),
            `old ${target.name}`,
          )
          writeFixture(
            join(target.stagedPath, target.newFile!),
            `new ${target.name}`,
          )
        }
        else {
          writeFixture(target.destinationPath, `old ${target.name}`)
          writeFixture(target.stagedPath, `new ${target.name}`)
        }
      }

      expect(() => commitMigrationTransaction({
        transactionRoot,
        targets,
        onCommitStep({ phase, index }) {
          if (phase === 'installed' && index === 1)
            throw new Error('injected commit failure')
        },
      })).toThrow('injected commit failure')

      for (const target of targets) {
        if (target.oldFile) {
          expect(readFileSync(
            join(target.destinationPath, target.oldFile),
            'utf8',
          )).toBe(`old ${target.name}`)
          expect(existsSync(
            join(target.destinationPath, target.newFile!),
          )).toBe(false)
        }
        else {
          expect(readFileSync(target.destinationPath, 'utf8'))
            .toBe(`old ${target.name}`)
        }
      }
      expect(existsSync(transactionRoot)).toBe(false)
    }
    finally {
      rmSync(fixtureRoot, { recursive: true, force: true })
    }
  })

  it('contains exactly 100 articles across all eight categories', () => {
    expect(manifest).toHaveLength(100)
    expect(new Set(manifest.map(entry => entry.category))).toEqual(
      new Set(categories.map(category => category.slug)),
    )
  })

  it('contains no generated Markdown outside the manifest', () => {
    const articlesRoot = join(projectRoot, 'content/articles')
    const generatedPaths = listMarkdownFiles(articlesRoot).map(file =>
      `/articles/${relative(articlesRoot, file)
        .split(sep)
        .join('/')
        .replace(/\.md$/, '')}`,
    )

    expect(generatedPaths).toHaveLength(100)
    expect(new Set(generatedPaths)).toEqual(
      new Set(manifest.map(entry => entry.newPath)),
    )
  })

  it('uses globally unique source, destination, and legacy paths', () => {
    expectUnique(manifest.map(entry => entry.sourcePath))
    expectUnique(manifest.map(entry => entry.newPath))
    expectUnique(manifest.flatMap(entry => entry.legacyPaths))
  })

  it('has complete, valid metadata for every article', () => {
    const validCategories = new Set(categories.map(category => category.slug))

    for (const entry of manifest) {
      expect(entry.sourcePath).toMatch(/\.md$/)
      expect(entry.newPath).toMatch(/^\/articles\/[^/]+\/[^/]+$/)
      expect(entry.title.trim()).not.toBe('')
      expect(entry.description.trim()).not.toBe('')
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(validCategories.has(entry.category)).toBe(true)
      expect(entry.categoryLabel.trim()).not.toBe('')
      expect(entry.legacyPaths).toHaveLength(2)
      expect(entry.missingLocalResources).toEqual([])
      expect(entry.sourceHash).toMatch(/^[a-f0-9]{64}$/)
      expect(entry.filledFields).toEqual(expect.objectContaining({}))
      expect(Object.keys(entry.filledFields).sort()).toEqual(
        Object.keys(entry.filledFields)
          .filter(field => field === 'title' || field === 'date')
          .sort(),
      )
      if (entry.filledFields.title)
        expect(['markdown-heading', 'manual-override'])
          .toContain(entry.filledFields.title)
      if (entry.filledFields.date)
        expect(entry.filledFields.date).toBe('git-first-commit')
    }
  })

  it('records the exact title and date recovery counts', () => {
    expect(manifest.filter(
      entry => entry.filledFields.title === 'markdown-heading',
    )).toHaveLength(17)
    expect(manifest.filter(
      entry => entry.filledFields.date === 'git-first-commit',
    )).toHaveLength(25)
    expect(JSON.stringify(manifest)).not.toContain('/Users/')
  })

  it.each([
    {
      field: 'filledFields',
      mutate(entry: MigrationEntry) {
        entry.filledFields = { title: 'filename' as 'markdown-heading' }
      },
    },
    {
      field: 'sourceHash',
      mutate(entry: MigrationEntry) {
        entry.sourceHash = 'not-a-sha256'
      },
    },
  ])('rejects an invalid manifest $field', ({ field, mutate }) => {
    const fixtureRoot = createVerifierFixture()
    const fixtureManifestPath = join(
      fixtureRoot,
      'content/migration-manifest.json',
    )

    try {
      const fixtureManifest = JSON.parse(
        readFileSync(fixtureManifestPath, 'utf8'),
      ) as MigrationEntry[]
      mutate(fixtureManifest[0])
      writeFileSync(
        fixtureManifestPath,
        `${JSON.stringify(fixtureManifest, null, 2)}\n`,
        'utf8',
      )
      expect(() => runVerifier(fixtureRoot))
        .toThrow(`invalid ${field}`)
    }
    finally {
      rmSync(fixtureRoot, { recursive: true, force: true })
    }
  })

  it('allows manual-override as a controlled title provenance', () => {
    const fixtureRoot = createVerifierFixture()
    const fixtureManifestPath = join(
      fixtureRoot,
      'content/migration-manifest.json',
    )

    try {
      const fixtureManifest = JSON.parse(
        readFileSync(fixtureManifestPath, 'utf8'),
      ) as MigrationEntry[]
      fixtureManifest[0].filledFields = { title: 'manual-override' }
      writeFileSync(
        fixtureManifestPath,
        `${JSON.stringify(fixtureManifest, null, 2)}\n`,
        'utf8',
      )
      expect(runVerifier(fixtureRoot))
        .toBe('Verified 100 migrated articles\n')
    }
    finally {
      rmSync(fixtureRoot, { recursive: true, force: true })
    }
  })

  it('writes every Markdown file without leaking legacy site configuration', () => {
    for (const entry of manifest) {
      const file = outputFile(entry)
      expect(existsSync(file), file).toBe(true)

      const source = readFileSync(file, 'utf8')
      const parsed = parseLegacyArticle(source, entry.sourcePath)
      expect(parsed.frontmatter).not.toHaveProperty('sidebar')
      expect(parsed.frontmatter).not.toHaveProperty('sidebarDepth')
      expect(source).not.toContain('OAuth Secret')
      expect(source).not.toMatch(/@vuepress\/plugin-|vuepress-plugin-/)
    }
  })

  it('rejects an unresolved relative legacy article link', () => {
    const fixtureRoot = createVerifierFixture()
    const article = join(fixtureRoot, 'content/articles/vue/1.md')

    try {
      writeFileSync(
        article,
        `${readFileSync(article, 'utf8')}\n[next](./2.html)\n`,
        'utf8',
      )

      expect(() => runVerifier(fixtureRoot))
        .toThrow('relative legacy article link was not rewritten')
    }
    finally {
      rmSync(fixtureRoot, { recursive: true, force: true })
    }
  })

  it.each([
    {
      kind: 'inline HTML link',
      markdown: '[missing](./999.html)',
    },
    {
      kind: 'Markdown definition',
      markdown: '[missing][missing]\n\n[missing]: ./999.md',
    },
  ])('rejects a broken relative article $kind absent from the manifest', ({
    markdown,
  }) => {
    const fixtureRoot = createVerifierFixture()
    const article = join(fixtureRoot, 'content/articles/vue/1.md')

    try {
      writeFileSync(
        article,
        `${readFileSync(article, 'utf8')}\n${markdown}\n`,
        'utf8',
      )

      expect(() => runVerifier(fixtureRoot))
        .toThrow('broken relative article link')
    }
    finally {
      rmSync(fixtureRoot, { recursive: true, force: true })
    }
  })

  it('rejects an unknown root-relative link', () => {
    const fixtureRoot = createVerifierFixture()
    const article = join(fixtureRoot, 'content/articles/vue/1.md')

    try {
      writeFileSync(
        article,
        `${readFileSync(article, 'utf8')}\n[broken](/definitely-missing.html)\n`,
        'utf8',
      )

      expect(() => runVerifier(fixtureRoot))
        .toThrow('broken internal link')
    }
    finally {
      rmSync(fixtureRoot, { recursive: true, force: true })
    }
  })

  it('allows an external HTML link', () => {
    const fixtureRoot = createVerifierFixture()
    const article = join(fixtureRoot, 'content/articles/vue/1.md')

    try {
      writeFileSync(
        article,
        `${readFileSync(article, 'utf8')}\n[external](https://example.com/2.html)\n`,
        'utf8',
      )

      expect(runVerifier(fixtureRoot))
        .toBe('Verified 100 migrated articles\n')
    }
    finally {
      rmSync(fixtureRoot, { recursive: true, force: true })
    }
  })

  it.each([
    '![image](./definitely-missing.html)',
    '![image reference][missing-image]\n\n[missing-image]: ./definitely-missing.md',
  ])('does not exempt a missing image because of its extension: %s', (
    markdown,
  ) => {
    const fixtureRoot = createVerifierFixture()
    const article = join(fixtureRoot, 'content/articles/vue/1.md')

    try {
      writeFileSync(
        article,
        `${readFileSync(article, 'utf8')}\n${markdown}\n`,
        'utf8',
      )

      expect(() => runVerifier(fixtureRoot))
        .toThrow('broken image resource')
    }
    finally {
      rmSync(fixtureRoot, { recursive: true, force: true })
    }
  })

  it('ignores code sample, anchor, mailto, and protocol-relative URLs', () => {
    const fixtureRoot = createVerifierFixture()
    const article = join(fixtureRoot, 'content/articles/vue/1.md')
    const ignoredLinks = [
      '```md',
      '[code sample](./999.html)',
      '```',
      '',
      '[anchor](#section)',
      '[email](mailto:author@example.com)',
      '[protocol relative](//example.com/999.html)',
    ].join('\n')

    try {
      writeFileSync(
        article,
        `${readFileSync(article, 'utf8')}\n${ignoredLinks}\n`,
        'utf8',
      )

      expect(runVerifier(fixtureRoot))
        .toBe('Verified 100 migrated articles\n')
    }
    finally {
      rmSync(fixtureRoot, { recursive: true, force: true })
    }
  })

  it.each([
    '<a href="/definitely-missing.html">broken</a>',
    '<a title="safe > text" href="/definitely-missing.html">broken</a>',
    '<img src="/definitely-missing.png">',
  ])('validates URLs in raw HTML: %s', (html) => {
    const fixtureRoot = createVerifierFixture()
    const article = join(fixtureRoot, 'content/articles/vue/1.md')

    try {
      writeFileSync(
        article,
        `${readFileSync(article, 'utf8')}\n${html}\n`,
        'utf8',
      )

      expect(() => runVerifier(fixtureRoot))
        .toThrow('broken raw HTML')
    }
    finally {
      rmSync(fixtureRoot, { recursive: true, force: true })
    }
  })

  it.each([
    '<script>unsafe()</script>',
    '<a href="javascript:unsafe()">unsafe</a>',
    '<img src="javascript:unsafe()">',
    '<div onclick="unsafe()">unsafe</div>',
    '<form action="javascript:alert(1)">unsafe</form>',
    '<form action=" \n&#x6a;AvAsCrIpT:alert(1)">unsafe</form>',
    '<img srcset="https://example.com/a.png 1x, JaVaScRiPt&#58;alert(1) 2x">',
    '<iframe srcdoc="<script>unsafe()</script>"></iframe>',
    '<meta http-equiv="refresh" content="0;url=javascript:unsafe()">',
    '<iframe src="data:text/html,<script>unsafe()</script>"></iframe>',
    '<custom-element>unsafe</custom-element>',
    '<svg><a href="https://example.com">unsafe</a></svg>',
    '<div style="color: red">unsafe</div>',
    '<div srcdoc="<p>unsafe</p>">unsafe</div>',
    '<a ping="https://tracker.example.com" href="https://example.com">unsafe</a>',
    '<a href="data:text/html,unsafe">unsafe</a>',
    '<a href="vbscript:unsafe">unsafe</a>',
    '<a href="file:///etc/passwd">unsafe</a>',
    '<a href="ftp://example.com/file">unsafe</a>',
    '<img srcset="data:image/png;base64,AAAA 1x">',
  ])('rejects unsafe raw HTML: %s', (html) => {
    const fixtureRoot = createVerifierFixture()
    const article = join(fixtureRoot, 'content/articles/vue/1.md')

    try {
      writeFileSync(
        article,
        `${readFileSync(article, 'utf8')}\n${html}\n`,
        'utf8',
      )

      expect(() => runVerifier(fixtureRoot)).toThrow('unsafe HTML')
    }
    finally {
      rmSync(fixtureRoot, { recursive: true, force: true })
    }
  })

  it('allows ordinary safe raw HTML', () => {
    const fixtureRoot = createVerifierFixture()
    const article = join(fixtureRoot, 'content/articles/vue/1.md')
    const html = [
      '<div title="safe > text">',
      '  <a href="https://example.com/page.html">safe</a>',
      '  <img src="https://example.com/image.png">',
      '</div>',
    ].join('\n')

    try {
      writeFileSync(
        article,
        `${readFileSync(article, 'utf8')}\n${html}\n`,
        'utf8',
      )
      expect(runVerifier(fixtureRoot))
        .toBe('Verified 100 migrated articles\n')
    }
    finally {
      rmSync(fixtureRoot, { recursive: true, force: true })
    }
  })

  it('does not inspect unsafe-looking HTML inside a code fence', () => {
    const fixtureRoot = createVerifierFixture()
    const article = join(fixtureRoot, 'content/articles/vue/1.md')
    const code = [
      '```html',
      '<script>example()</script>',
      '<a href="javascript:example()" onclick="example()">example</a>',
      '```',
    ].join('\n')

    try {
      writeFileSync(
        article,
        `${readFileSync(article, 'utf8')}\n${code}\n`,
        'utf8',
      )
      expect(runVerifier(fixtureRoot))
        .toBe('Verified 100 migrated articles\n')
    }
    finally {
      rmSync(fixtureRoot, { recursive: true, force: true })
    }
  })

  it('rejects a 101st Markdown file that is absent from the manifest', () => {
    const fixtureRoot = createVerifierFixture()

    try {
      writeFixture(
        join(fixtureRoot, 'content/articles/vue/101.md'),
        readFileSync(
          join(fixtureRoot, 'content/articles/vue/1.md'),
          'utf8',
        ),
      )

      expect(() => runVerifier(fixtureRoot))
        .toThrow('generated Markdown set does not match the manifest')
    }
    finally {
      rmSync(fixtureRoot, { recursive: true, force: true })
    }
  })

  it('passes the independent migration verifier', () => {
    expect(execFileSync(
      process.execPath,
      ['scripts/verify-migrated-content.mjs'],
      { cwd: projectRoot, encoding: 'utf8' },
    )).toBe('Verified 100 migrated articles\n')
  })
})
