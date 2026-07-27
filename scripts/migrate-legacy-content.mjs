#!/usr/bin/env node

import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from 'node:path'
import { fileURLToPath } from 'node:url'

import { fromMarkdown } from 'mdast-util-from-markdown'

import categories from '../shared/article-categories.json' with { type: 'json' }
import {
  createArticleRecord,
  parseLegacyArticle,
  rewriteLegacyLinks,
  serializeMigratedArticle,
} from './lib/legacy-content.mjs'

const EXPECTED_ARTICLE_COUNT = 100
const scriptPath = fileURLToPath(import.meta.url)
const defaultProjectRoot = resolve(dirname(scriptPath), '..')
const defaultOutput = 'content/articles'

// Every currently missing title is recoverable from a real Markdown heading.
// Add an entry here only after a human review of the source article.
const titleOverrides = Object.freeze({})

function parseArguments(argv, env = process.env) {
  const values = new Map()

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--')
      continue
    if (!['--source', '--output'].includes(argument))
      throw new Error(`Unknown argument: ${argument}`)
    const value = argv[index + 1]
    if (!value || value.startsWith('--'))
      throw new Error(`Missing value for ${argument}`)
    values.set(argument, value)
    index += 1
  }

  const source = values.get('--source') ?? env.LEGACY_BLOG_SOURCE
  if (!source)
    throw new Error('Provide --source or LEGACY_BLOG_SOURCE')

  return validateMigrationPaths({
    projectRoot: defaultProjectRoot,
    sourceRoot: resolve(source),
    output: values.get('--output') ?? defaultOutput,
  })
}

function listMarkdownFiles(directory) {
  const files = []

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === '.vuepress')
      continue

    const absolutePath = join(directory, entry.name)
    if (entry.isSymbolicLink())
      throw new Error(`Legacy source contains a symbolic link: ${absolutePath}`)
    if (entry.isDirectory()) {
      files.push(...listMarkdownFiles(absolutePath))
    }
    else if (entry.isFile()
      && extname(entry.name).toLowerCase() === '.md'
      && entry.name.toLowerCase() !== 'readme.md') {
      files.push(absolutePath)
    }
  }

  return files
}

function lstatIfPresent(path) {
  try {
    return lstatSync(path)
  }
  catch (error) {
    if (error?.code === 'ENOENT')
      return null
    throw error
  }
}

function assertNoSymlinkAncestors(projectRoot, targetPath) {
  const relativeTarget = relative(projectRoot, targetPath)
  let cursor = projectRoot
  for (const segment of ['', ...relativeTarget.split(sep).filter(Boolean)]) {
    if (segment)
      cursor = join(cursor, segment)
    const stats = lstatIfPresent(cursor)
    if (stats?.isSymbolicLink())
      throw new Error(`Migration target has a symbolic link ancestor: ${cursor}`)
  }
}

function pathContains(parent, child) {
  const relation = relative(parent, child)
  return relation === ''
    || (!relation.startsWith(`..${sep}`)
      && relation !== '..'
      && !isAbsolute(relation))
}

export function validateMigrationPaths({
  projectRoot,
  sourceRoot,
  output = defaultOutput,
}) {
  const resolvedProjectRoot = resolve(projectRoot)
  const expectedOutput = resolve(resolvedProjectRoot, defaultOutput)
  const requestedOutput = isAbsolute(output)
    ? resolve(output)
    : resolve(resolvedProjectRoot, output)

  if (requestedOutput !== expectedOutput) {
    throw new Error(
      `Unsafe migration output: only ${expectedOutput} is allowed`,
    )
  }

  assertNoSymlinkAncestors(resolvedProjectRoot, expectedOutput)

  const sourceStats = lstatIfPresent(sourceRoot)
  if (sourceStats?.isSymbolicLink())
    throw new Error(`Legacy source directory is a symbolic link: ${sourceRoot}`)
  if (!sourceStats?.isDirectory())
    throw new Error(`Legacy source directory does not exist: ${sourceRoot}`)

  const docsRoot = join(sourceRoot, 'docs')
  const docsStats = lstatIfPresent(docsRoot)
  if (docsStats?.isSymbolicLink())
    throw new Error(`Legacy docs directory is a symbolic link: ${docsRoot}`)
  if (!docsStats?.isDirectory())
    throw new Error(`Legacy docs directory does not exist: ${docsRoot}`)

  const realProjectRoot = realpathSync(resolvedProjectRoot)
  const canonicalOutput = resolve(realProjectRoot, defaultOutput)
  const realDocsRoot = realpathSync(docsRoot)
  if (pathContains(realDocsRoot, canonicalOutput)
    || pathContains(canonicalOutput, realDocsRoot)) {
    throw new Error('Migration output overlaps source/docs')
  }

  return {
    projectRoot: realProjectRoot,
    sourceRoot: realpathSync(sourceRoot),
    outputRoot: canonicalOutput,
  }
}

function naturalSourceOrder(left, right) {
  return left.localeCompare(right, 'en', {
    numeric: true,
    sensitivity: 'base',
  })
}

function collectSourceFiles(sourceRoot) {
  const docsRoot = join(sourceRoot, 'docs')
  if (!existsSync(docsRoot) || !statSync(docsRoot).isDirectory())
    throw new Error(`Legacy docs directory does not exist: ${docsRoot}`)

  const files = []
  for (const category of categories) {
    const categoryRoot = join(
      docsRoot,
      ...category.legacyDirectory.split('/'),
    )
    if (!existsSync(categoryRoot) || !statSync(categoryRoot).isDirectory()) {
      throw new Error(
        `Legacy category directory does not exist: ${category.legacyDirectory}`,
      )
    }
    files.push(...listMarkdownFiles(categoryRoot))
  }

  const realDocsRoot = realpathSync(docsRoot)
  return files
    .map((absolutePath) => {
      const stats = lstatSync(absolutePath)
      if (stats.isSymbolicLink())
        throw new Error(`Legacy article is a symbolic link: ${absolutePath}`)
      const realArticle = realpathSync(absolutePath)
      if (!pathContains(realDocsRoot, realArticle))
        throw new Error(`Legacy article resolves outside docs: ${absolutePath}`)
      return {
        absolutePath,
        sourcePath: relative(docsRoot, absolutePath).split(sep).join('/'),
      }
    })
    .sort((left, right) => naturalSourceOrder(
      left.sourcePath,
      right.sourcePath,
    ))
}

function resolveFirstCommitDate(sourceRoot, sourcePath) {
  const relativeFile = `docs/${sourcePath}`
  const output = execFileSync(
    'git',
    [
      '-C',
      sourceRoot,
      'log',
      '--follow',
      '--format=%as',
      '--reverse',
      '--',
      relativeFile,
    ],
    { encoding: 'utf8' },
  )
  const firstDate = output
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(Boolean)

  if (!firstDate)
    throw new Error('unable to find first Git commit date')

  return firstDate
}

function applyTitleOverride(parsed) {
  const override = titleOverrides[parsed.sourcePath]
  if (!override)
    return parsed

  return {
    ...parsed,
    frontmatter: {
      ...parsed.frontmatter,
      title: override,
    },
  }
}

export function createFilledFields({
  hadTitle,
  usedTitleOverride,
  filledDate,
}) {
  const filledFields = {}
  if (usedTitleOverride)
    filledFields.title = 'manual-override'
  else if (!hadTitle)
    filledFields.title = 'markdown-heading'
  if (filledDate)
    filledFields.date = 'git-first-commit'
  return filledFields
}

function collectMarkdownNodes(tree) {
  const nodes = []
  const stack = [tree]

  while (stack.length) {
    const node = stack.pop()
    nodes.push(node)
    const children = node.children ?? []
    for (let index = children.length - 1; index >= 0; index -= 1)
      stack.push(children[index])
  }

  return nodes
}

function isRemoteOrAnchor(url) {
  return !url
    || url.startsWith('#')
    || url.startsWith('?')
    || url.startsWith('//')
    || /^[A-Za-z][A-Za-z\d+.-]*:/.test(url)
}

function splitUrlSuffix(url) {
  const suffixIndex = url.search(/[?#]/)
  return suffixIndex === -1
    ? { pathname: url, suffix: '' }
    : {
        pathname: url.slice(0, suffixIndex),
        suffix: url.slice(suffixIndex),
      }
}

function resolveLocalResource(docsRoot, sourcePath, url, nodeType) {
  if (isRemoteOrAnchor(url))
    return null

  const { pathname, suffix } = splitUrlSuffix(url)
  let decodedPath
  try {
    decodedPath = decodeURI(pathname)
  }
  catch {
    return null
  }

  const extension = extname(decodedPath).toLowerCase()
  if (nodeType !== 'image'
    && nodeType !== 'definition'
    && (!extension || extension === '.md' || extension === '.html')) {
    return null
  }
  if (extension === '.md' || extension === '.html')
    return null

  const absolutePath = decodedPath.startsWith('/')
    ? resolve(docsRoot, `.${decodedPath}`)
    : resolve(docsRoot, dirname(sourcePath), decodedPath)
  const relativePath = relative(docsRoot, absolutePath)
  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    return {
      url,
      suffix,
      sourcePath: null,
      absolutePath: null,
    }
  }

  return {
    url,
    suffix,
    sourcePath: relativePath.split(sep).join('/'),
    absolutePath,
  }
}

function assertSafeSourceResource(resource, docsRoot, sourcePath) {
  if (!resource.absolutePath || !existsSync(resource.absolutePath))
    return false

  const stats = lstatSync(resource.absolutePath)
  if (stats.isSymbolicLink()) {
    throw new Error(
      `${sourcePath}: local resource is a symbolic link: ${resource.url}`,
    )
  }
  if (!stats.isFile())
    return false

  const realDocsRoot = realpathSync(docsRoot)
  const realResource = realpathSync(resource.absolutePath)
  if (!pathContains(realDocsRoot, realResource)) {
    throw new Error(
      `${sourcePath}: local resource resolves outside docs: ${resource.url}`,
    )
  }
  return true
}

function isEscaped(source, index) {
  let backslashes = 0
  for (let cursor = index - 1; cursor >= 0 && source[cursor] === '\\'; cursor -= 1)
    backslashes += 1
  return backslashes % 2 === 1
}

function findUnescaped(source, sequence, start, end) {
  let index = source.indexOf(sequence, start)
  while (index !== -1 && index < end) {
    if (!isEscaped(source, index))
      return index
    index = source.indexOf(sequence, index + sequence.length)
  }
  return -1
}

function findDestinationSpan(markdown, node) {
  const nodeStart = node.position?.start?.offset
  const nodeEnd = node.position?.end?.offset
  if (!Number.isInteger(nodeStart) || !Number.isInteger(nodeEnd))
    return null

  let cursor
  if (node.type === 'link' || node.type === 'image') {
    const lastChildEnd = node.children?.at(-1)?.position?.end?.offset
    const marker = ']('
    const markerStart = findUnescaped(
      markdown,
      marker,
      Number.isInteger(lastChildEnd) ? lastChildEnd : nodeStart,
      nodeEnd,
    )
    if (markerStart === -1)
      return null
    cursor = markerStart + marker.length
  }
  else if (node.type === 'definition') {
    const markerStart = findUnescaped(markdown, ']:', nodeStart, nodeEnd)
    if (markerStart === -1)
      return null
    cursor = markerStart + 2
  }
  else {
    return null
  }

  while (cursor < nodeEnd && /[ \t\r\n]/.test(markdown[cursor]))
    cursor += 1

  if (markdown[cursor] === '<') {
    const start = cursor + 1
    for (let end = start; end < nodeEnd; end += 1) {
      if (markdown[end] === '>' && !isEscaped(markdown, end))
        return { start, end }
    }
    return null
  }

  const start = cursor
  let depth = 0
  while (cursor < nodeEnd) {
    const character = markdown[cursor]
    if (character === '\\' && cursor + 1 < nodeEnd) {
      cursor += 2
      continue
    }
    if (/[ \t\r\n]/.test(character) && depth === 0)
      break
    if (character === '(') {
      depth += 1
    }
    else if (character === ')') {
      if (depth === 0)
        break
      depth -= 1
    }
    cursor += 1
  }

  return cursor > start ? { start, end: cursor } : null
}

function planLocalResources(record, docsRoot) {
  let tree
  try {
    tree = fromMarkdown(record.body)
  }
  catch {
    return {
      body: record.body,
      localResources: [],
      missingLocalResources: [],
    }
  }

  const replacements = []
  const localResources = []
  const missingLocalResources = []
  const publicPaths = new Map()

  for (const node of collectMarkdownNodes(tree)) {
    if (!['image', 'link', 'definition'].includes(node.type))
      continue

    const resource = resolveLocalResource(
      docsRoot,
      record.sourcePath,
      node.url,
      node.type,
    )
    if (!resource)
      continue

    if (!assertSafeSourceResource(resource, docsRoot, record.sourcePath)) {
      missingLocalResources.push(resource.url)
      continue
    }

    const outputName = basename(resource.absolutePath)
    const publicPath = `/articles/${record.category}/${record.id}/${outputName}`
    const existingSource = publicPaths.get(publicPath)
    if (existingSource && existingSource !== resource.sourcePath) {
      throw new Error(
        `${record.sourcePath}: local resources collide at ${publicPath}`,
      )
    }
    publicPaths.set(publicPath, resource.sourcePath)

    const span = findDestinationSpan(record.body, node)
    if (!span)
      throw new Error(`${record.sourcePath}: unable to rewrite local resource ${node.url}`)

    replacements.push({
      ...span,
      value: `${publicPath}${resource.suffix}`,
    })
    localResources.push({
      sourcePath: resource.sourcePath,
      publicPath,
      absolutePath: resource.absolutePath,
    })
  }

  let body = record.body
  for (const replacement of replacements.sort((left, right) => right.start - left.start)) {
    body = body.slice(0, replacement.start)
      + replacement.value
      + body.slice(replacement.end)
  }

  return {
    body,
    localResources: [...new Map(
      localResources.map(resource => [resource.publicPath, resource]),
    ).values()],
    missingLocalResources: [...new Set(missingLocalResources)],
  }
}

function assertUnique(entries, select, label) {
  const seen = new Map()
  for (const entry of entries) {
    for (const value of select(entry)) {
      const previous = seen.get(value)
      if (previous)
        throw new Error(`${label} "${value}" is shared by ${previous} and ${entry.sourcePath}`)
      seen.set(value, entry.sourcePath)
    }
  }
}

function validateRecords(records) {
  if (records.length !== EXPECTED_ARTICLE_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_ARTICLE_COUNT} articles, found ${records.length}`,
    )
  }

  assertUnique(records, record => [record.sourcePath], 'sourcePath')
  assertUnique(records, record => [record.newPath], 'newPath')
  assertUnique(records, record => record.legacyPaths, 'legacyPath')

  const validCategories = new Set(categories.map(category => category.slug))
  for (const record of records) {
    if (!validCategories.has(record.category))
      throw new Error(`${record.sourcePath}: invalid category ${record.category}`)
    if (!record.title || !record.description)
      throw new Error(`${record.sourcePath}: title and description are required`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date))
      throw new Error(`${record.sourcePath}: invalid date ${record.date}`)
  }

  const migratedCategories = new Set(records.map(record => record.category))
  if (migratedCategories.size !== categories.length)
    throw new Error('Not all configured article categories contain migrated content')
}

function manifestEntry(record) {
  return {
    sourcePath: record.sourcePath,
    newPath: record.newPath,
    title: record.title,
    description: record.description,
    date: record.date,
    category: record.category,
    categoryLabel: record.categoryLabel,
    tags: record.tags,
    legacyPaths: record.legacyPaths,
    draft: record.draft,
    filledFields: record.filledFields,
    sourceHash: record.sourceHash,
    localResources: (record.localResources ?? []).map(resource => ({
      sourcePath: resource.sourcePath,
      publicPath: resource.publicPath,
    })),
    missingLocalResources: record.missingLocalResources ?? [],
  }
}

export function commitMigrationTransaction({
  transactionRoot,
  targets,
  onCommitStep = () => {},
}) {
  const backups = []
  const installed = []
  let preserveTransactionRoot = false

  try {
    for (let index = 0; index < targets.length; index += 1) {
      const target = targets[index]
      const backupPath = join(
        transactionRoot,
        'backup',
        `${index}-${target.name}`,
      )

      if (existsSync(target.destinationPath)) {
        mkdirSync(dirname(backupPath), { recursive: true })
        renameSync(target.destinationPath, backupPath)
        backups.push({
          destinationPath: target.destinationPath,
          backupPath,
        })
        onCommitStep({ phase: 'backed-up', index, target })
      }

      mkdirSync(dirname(target.destinationPath), { recursive: true })
      renameSync(target.stagedPath, target.destinationPath)
      installed.push(target.destinationPath)
      onCommitStep({ phase: 'installed', index, target })
    }
  }
  catch (error) {
    const rollbackErrors = []

    for (const destinationPath of installed.reverse()) {
      try {
        rmSync(destinationPath, { recursive: true, force: true })
      }
      catch (rollbackError) {
        rollbackErrors.push(rollbackError)
      }
    }

    for (const backup of backups.reverse()) {
      try {
        rmSync(backup.destinationPath, { recursive: true, force: true })
        mkdirSync(dirname(backup.destinationPath), { recursive: true })
        renameSync(backup.backupPath, backup.destinationPath)
      }
      catch (rollbackError) {
        rollbackErrors.push(rollbackError)
      }
    }

    if (rollbackErrors.length) {
      preserveTransactionRoot = true
      throw new AggregateError(
        [error, ...rollbackErrors],
        `Migration commit failed and rollback was incomplete; backups remain at ${transactionRoot}`,
      )
    }
    throw error
  }
  finally {
    if (!preserveTransactionRoot)
      rmSync(transactionRoot, { recursive: true, force: true })
  }
}

function assertFixedMigrationTargets(projectRoot, targets) {
  const expected = new Map([
    ['articles', join(projectRoot, 'content/articles')],
    ['manifest', join(projectRoot, 'content/migration-manifest.json')],
    ['redirects', join(projectRoot, 'server/data/legacy-redirects.json')],
    ['public', join(projectRoot, 'public/articles')],
  ])
  if (targets.length !== expected.size)
    throw new Error('Unsafe migration targets: incomplete fixed target set')

  for (const target of targets) {
    const expectedPath = expected.get(target.name)
    if (!expectedPath || resolve(target.destinationPath) !== expectedPath) {
      throw new Error(
        `Unsafe migration target for ${target.name}: ${target.destinationPath}`,
      )
    }
    assertNoSymlinkAncestors(projectRoot, target.destinationPath)
  }
}

function writeMigration(records, { projectRoot, outputRoot }) {
  const transactionRoot = join(
    projectRoot,
    `.content-migration-tmp-${process.pid}`,
  )
  const stagedRoot = join(transactionRoot, 'staged')
  const tempArticlesRoot = join(stagedRoot, 'content/articles')
  const tempManifest = join(stagedRoot, 'content/migration-manifest.json')
  const tempRedirects = join(
    stagedRoot,
    'server/data/legacy-redirects.json',
  )
  const tempPublicRoot = join(stagedRoot, 'public/articles')
  const targets = [
    {
      name: 'articles',
      stagedPath: tempArticlesRoot,
      destinationPath: outputRoot,
    },
    {
      name: 'manifest',
      stagedPath: tempManifest,
      destinationPath: join(
        projectRoot,
        'content/migration-manifest.json',
      ),
    },
    {
      name: 'redirects',
      stagedPath: tempRedirects,
      destinationPath: join(
        projectRoot,
        'server/data/legacy-redirects.json',
      ),
    },
    {
      name: 'public',
      stagedPath: tempPublicRoot,
      destinationPath: join(projectRoot, 'public/articles'),
    },
  ]

  assertFixedMigrationTargets(projectRoot, targets)
  rmSync(transactionRoot, { recursive: true, force: true })
  mkdirSync(tempArticlesRoot, { recursive: true })
  mkdirSync(tempPublicRoot, { recursive: true })
  mkdirSync(dirname(tempRedirects), { recursive: true })
  let transactionHandlesCleanup = false

  try {
    for (const record of records) {
      const relativeOutput = `${record.newPath.replace(/^\/articles\//, '')}.md`
      const articleOutput = join(tempArticlesRoot, relativeOutput)
      mkdirSync(dirname(articleOutput), { recursive: true })
      writeFileSync(articleOutput, serializeMigratedArticle(record), 'utf8')

      for (const resource of record.localResources) {
        const relativePublicPath = resource.publicPath.replace(/^\//, '')
        const resourceOutput = join(stagedRoot, 'public', relativePublicPath)
        mkdirSync(dirname(resourceOutput), { recursive: true })
        cpSync(resource.absolutePath, resourceOutput)
      }
    }

    const manifest = records.map(manifestEntry)
    const redirects = Object.fromEntries(
      manifest.flatMap(entry =>
        entry.legacyPaths.map(legacyPath => [legacyPath, entry.newPath]),
      ),
    )
    writeFileSync(tempManifest, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
    writeFileSync(tempRedirects, `${JSON.stringify(redirects, null, 2)}\n`, 'utf8')

    execFileSync(
      process.execPath,
      [join(defaultProjectRoot, 'scripts/verify-migrated-content.mjs'), '--root', stagedRoot],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    )

    assertFixedMigrationTargets(projectRoot, targets)
    transactionHandlesCleanup = true
    commitMigrationTransaction({
      transactionRoot,
      targets,
    })
  }
  finally {
    if (!transactionHandlesCleanup)
      rmSync(transactionRoot, { recursive: true, force: true })
  }
}

export function migrateLegacyContent({
  projectRoot,
  sourceRoot,
  outputRoot,
}) {
  const safePaths = validateMigrationPaths({
    projectRoot,
    sourceRoot,
    output: outputRoot,
  })
  projectRoot = safePaths.projectRoot
  sourceRoot = safePaths.sourceRoot
  outputRoot = safePaths.outputRoot
  const docsRoot = join(sourceRoot, 'docs')
  const sources = collectSourceFiles(sourceRoot)
  const records = sources.map(({ absolutePath, sourcePath }) => {
    const source = readFileSync(absolutePath, 'utf8')
    const originalParsed = parseLegacyArticle(source, sourcePath)
    const originalTitle = typeof originalParsed.frontmatter.title === 'string'
      ? originalParsed.frontmatter.title.trim()
      : ''
    const usedTitleOverride = Boolean(titleOverrides[sourcePath])
    const parsed = applyTitleOverride(originalParsed)
    let filledDate = false
    const record = createArticleRecord(parsed, {
      resolveFirstCommitDate(path) {
        filledDate = true
        return resolveFirstCommitDate(sourceRoot, path)
      },
    })
    const filledFields = createFilledFields({
      hadTitle: Boolean(originalTitle),
      usedTitleOverride,
      filledDate,
    })

    return {
      ...record,
      newPath: record.path,
      filledFields,
      sourceHash: createHash('sha256').update(source).digest('hex'),
    }
  })

  validateRecords(records)

  const manifest = records.map(manifestEntry)
  const completedRecords = records.map((record) => {
    const linkedBody = rewriteLegacyLinks(
      record.body,
      manifest,
      record.sourcePath,
    )
    const resources = planLocalResources(
      { ...record, body: linkedBody },
      docsRoot,
    )
    return {
      ...record,
      ...resources,
    }
  })

  validateRecords(completedRecords)
  writeMigration(completedRecords, { projectRoot, outputRoot })
  return completedRecords.length
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(scriptPath)) {
  try {
    const count = migrateLegacyContent(parseArguments(process.argv.slice(2)))
    process.stdout.write(`Migrated ${count} articles\n`)
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`Migration failed: ${message}\n`)
    process.exitCode = 1
  }
}
