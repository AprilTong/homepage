import { posix as posixPath } from 'node:path'

import { fromMarkdown } from 'mdast-util-from-markdown'
import { toString as mdastToString } from 'mdast-util-to-string'

import categories from '../../shared/article-categories.json' with { type: 'json' }

function migrationError(sourcePath, message) {
  return new Error(`${sourcePath}: ${message}`)
}

function splitInlineList(value) {
  const values = []
  let current = ''
  let quote = ''

  for (const character of value) {
    if (quote) {
      current += character
      if (character === quote)
        quote = ''
      continue
    }

    if (character === '"' || character === '\'') {
      quote = character
      current += character
    }
    else if (character === ',') {
      values.push(current.trim())
      current = ''
    }
    else {
      current += character
    }
  }

  if (current.trim())
    values.push(current.trim())

  return values
}

function stripYamlComment(value) {
  let quote = ''
  let escaped = false

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]

    if (quote === '"') {
      if (escaped) {
        escaped = false
      }
      else if (character === '\\') {
        escaped = true
      }
      else if (character === '"') {
        quote = ''
      }
      continue
    }

    if (quote === '\'') {
      if (character === '\'' && value[index + 1] === '\'') {
        index += 1
      }
      else if (character === '\'') {
        quote = ''
      }
      continue
    }

    if (character === '"' || character === '\'') {
      quote = character
    }
    else if (character === '#'
      && (index === 0 || /\s/.test(value[index - 1]))) {
      return value.slice(0, index)
    }
  }

  return value
}

function parseScalar(value) {
  const withoutComment = stripYamlComment(value).trim()

  if (withoutComment.startsWith('[') && withoutComment.endsWith(']')) {
    const content = withoutComment.slice(1, -1).trim()
    return content ? splitInlineList(content).map(parseScalar) : []
  }

  if (withoutComment.startsWith('"') && withoutComment.endsWith('"')) {
    try {
      return JSON.parse(withoutComment)
    }
    catch {
      return withoutComment.slice(1, -1)
    }
  }

  if (withoutComment.startsWith('\'') && withoutComment.endsWith('\'')) {
    return withoutComment.slice(1, -1).replaceAll('\'\'', '\'')
  }

  if (withoutComment === 'true')
    return true
  if (withoutComment === 'false')
    return false
  if (withoutComment === 'null' || withoutComment === '~')
    return null
  if (/^-?\d+(?:\.\d+)?$/.test(withoutComment))
    return Number(withoutComment)

  return withoutComment
}

function parseFrontmatter(source, sourcePath) {
  const frontmatter = {}
  const lines = source.split(/\r?\n/)

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (!line.trim() || line.trimStart().startsWith('#'))
      continue

    const property = line.match(/^([A-Za-z][\w-]*):(?:[ \t]*(.*))?$/)
    if (!property)
      continue

    const [, key, rawValue = ''] = property
    if (rawValue === '|' || rawValue === '>') {
      const blockLines = []
      while (index + 1 < lines.length) {
        const nextLine = lines[index + 1]
        if (nextLine && !/^[ \t]/.test(nextLine))
          break
        index += 1
        blockLines.push(nextLine.replace(/^[ \t]{1,2}/, ''))
      }
      frontmatter[key] = rawValue === '>'
        ? blockLines.join(' ').trim()
        : blockLines.join('\n').replace(/\n+$/, '')
      continue
    }

    if (!rawValue) {
      const items = []
      while (index + 1 < lines.length) {
        const item = lines[index + 1].match(/^[ \t]+-[ \t]+(.*)$/)
        if (!item)
          break
        index += 1
        items.push(parseScalar(item[1]))
      }
      frontmatter[key] = items
      continue
    }

    frontmatter[key] = parseScalar(rawValue)
  }

  if (Object.prototype.hasOwnProperty.call(frontmatter, 'tags')
    && !Array.isArray(frontmatter.tags)
    && typeof frontmatter.tags !== 'string') {
    throw migrationError(sourcePath, 'tags must be a string or an array')
  }

  return frontmatter
}

function findCategory(sourcePath) {
  const normalizedPath = sourcePath.replaceAll('\\', '/').replace(/^\.?\//, '')

  return categories.find(({ legacyDirectory }) =>
    normalizedPath === legacyDirectory
    || normalizedPath.startsWith(`${legacyDirectory}/`)
    || normalizedPath.includes(`/${legacyDirectory}/`)
    || normalizedPath.endsWith(`/${legacyDirectory}`),
  ) ?? null
}

function findFirstMarkdownNode(tree, type) {
  const stack = [tree]

  while (stack.length) {
    const node = stack.pop()
    if (node.type === type)
      return node

    const children = node.children ?? []
    for (let index = children.length - 1; index >= 0; index -= 1)
      stack.push(children[index])
  }

  return null
}

function normalizeMarkdownText(value) {
  return value.replace(/\s+/g, ' ').trim()
}

function findFirstHeading(tree) {
  const heading = findFirstMarkdownNode(tree, 'heading')
  return heading ? normalizeMarkdownText(mdastToString(heading)) : ''
}

function createDescription(tree, title) {
  const paragraph = findFirstMarkdownNode(tree, 'paragraph')
  const text = paragraph
    ? normalizeMarkdownText(mdastToString(paragraph))
    : title
  const description = text || title

  return description.length > 160
    ? `${description.slice(0, 159).trimEnd()}…`
    : description
}

function normalizeDate(value) {
  if (value instanceof Date && !Number.isNaN(value.valueOf()))
    return value.toISOString().slice(0, 10)

  if (typeof value !== 'string')
    return null

  const match = value.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/)
  if (!match)
    return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day) {
    return null
  }

  return [
    year.toString().padStart(4, '0'),
    month.toString().padStart(2, '0'),
    day.toString().padStart(2, '0'),
  ].join('-')
}

function normalizeTags(value) {
  const tags = Array.isArray(value) ? value : value ? [value] : []

  return [...new Set(tags
    .map(tag => String(tag).trim())
    .filter(Boolean))]
}

function quoteYamlString(value) {
  return JSON.stringify(String(value))
}

function createLinkMap(manifest) {
  const links = new Map()
  const entries = Array.isArray(manifest)
    ? manifest
    : Array.isArray(manifest?.articles)
      ? manifest.articles
      : null

  if (entries) {
    for (const entry of entries) {
      const target = entry.path ?? entry.newPath
      if (!target)
        continue
      for (const legacyPath of entry.legacyPaths ?? [])
        links.set(legacyPath, target)
    }
    return links
  }

  if (manifest instanceof Map)
    return new Map(manifest)

  if (manifest && typeof manifest === 'object') {
    for (const [legacyPath, target] of Object.entries(manifest)) {
      if (typeof target === 'string')
        links.set(legacyPath, target)
    }
  }

  return links
}

function normalizeLegacySourcePath(sourcePath) {
  if (typeof sourcePath !== 'string' || !sourcePath)
    return ''

  const rootedPath = `/${sourcePath
    .replaceAll('\\', '/')
    .replace(/^\/+/, '')}`

  for (const { legacyDirectory } of categories) {
    const marker = `/${legacyDirectory}/`
    const markerIndex = rootedPath.lastIndexOf(marker)
    if (markerIndex !== -1)
      return posixPath.normalize(rootedPath.slice(markerIndex))
  }

  return posixPath.normalize(rootedPath)
}

function isValidInternalLinkPath(destination) {
  if (!destination
    || destination.startsWith('//')
    || /^[A-Za-z][A-Za-z\d+.-]*:/.test(destination)) {
    return false
  }

  try {
    decodeURI(destination)
    return true
  }
  catch {
    return false
  }
}

function resolvePosixPathWithinRoot(destination, sourcePath) {
  if (!isValidInternalLinkPath(destination))
    return null

  let decodedDestination
  try {
    decodedDestination = decodeURI(destination)
  }
  catch {
    return null
  }

  const normalizedSourcePath = normalizeLegacySourcePath(sourcePath)
  const baseSegments = decodedDestination.startsWith('/')
    ? []
    : posixPath.dirname(normalizedSourcePath)
        .split('/')
        .filter(Boolean)
  const resolvedSegments = [...baseSegments]

  for (const segment of decodedDestination.split('/')) {
    if (!segment || segment === '.')
      continue
    if (segment === '..') {
      if (!resolvedSegments.length)
        return null
      resolvedSegments.pop()
      continue
    }
    resolvedSegments.push(segment)
  }

  return posixPath.normalize(`/${resolvedSegments.join('/')}`)
}

function resolveLegacyLinkTarget(destination, links, sourcePath) {
  const suffixIndex = destination.search(/[?#]/)
  const path = suffixIndex === -1
    ? destination
    : destination.slice(0, suffixIndex)
  const suffix = suffixIndex === -1 ? '' : destination.slice(suffixIndex)
  if (!isValidInternalLinkPath(path))
    return null

  const resolvedPath = sourcePath
    ? resolvePosixPathWithinRoot(path, sourcePath)
    : null
  if (sourcePath && !resolvedPath)
    return null

  const target = links.get(path)
    ?? (path.startsWith('/') ? null : links.get(`/${path}`))
    ?? (resolvedPath ? links.get(resolvedPath) : null)

  return target ? `${target}${suffix}` : null
}

function isEscaped(source, index) {
  let backslashes = 0

  for (let cursor = index - 1; cursor >= 0 && source[cursor] === '\\'; cursor -= 1)
    backslashes += 1

  return backslashes % 2 === 1
}

function findUnescapedSequence(source, sequence, start, end) {
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
  if (node.type === 'link') {
    const children = node.children ?? []
    const lastChildEnd = children.at(-1)?.position?.end?.offset
    const searchStart = Number.isInteger(lastChildEnd)
      ? lastChildEnd
      : nodeStart
    const resourceStart = findUnescapedSequence(
      markdown,
      '](',
      searchStart,
      nodeEnd,
    )
    if (resourceStart === -1)
      return null
    cursor = resourceStart + 2
  }
  else if (node.type === 'definition') {
    const definitionStart = findUnescapedSequence(
      markdown,
      ']:',
      nodeStart,
      nodeEnd,
    )
    if (definitionStart === -1)
      return null
    cursor = definitionStart + 2
  }
  else {
    return null
  }

  while (cursor < nodeEnd && /[ \t\r\n]/.test(markdown[cursor]))
    cursor += 1

  if (markdown[cursor] === '<') {
    const destinationStart = cursor + 1
    let destinationEnd = destinationStart
    while (destinationEnd < nodeEnd) {
      if (markdown[destinationEnd] === '>'
        && !isEscaped(markdown, destinationEnd)) {
        return { start: destinationStart, end: destinationEnd }
      }
      destinationEnd += 1
    }
    return null
  }

  const destinationStart = cursor
  let parenthesisDepth = 0

  while (cursor < nodeEnd) {
    const character = markdown[cursor]
    if (character === '\\' && cursor + 1 < nodeEnd) {
      cursor += 2
      continue
    }
    if (/[ \t\r\n]/.test(character) && parenthesisDepth === 0)
      break
    if (character === '(') {
      parenthesisDepth += 1
    }
    else if (character === ')') {
      if (parenthesisDepth === 0)
        break
      parenthesisDepth -= 1
    }
    cursor += 1
  }

  return cursor > destinationStart
    ? { start: destinationStart, end: cursor }
    : null
}

function collectLinkReplacements(markdown, tree, links, sourcePath) {
  const replacements = []
  const nodes = []
  const imageReferenceIdentifiers = new Set()
  const stack = [tree]

  while (stack.length) {
    const node = stack.pop()
    nodes.push(node)
    if (node.type === 'imageReference')
      imageReferenceIdentifiers.add(node.identifier)

    const children = node.children ?? []
    for (let index = children.length - 1; index >= 0; index -= 1)
      stack.push(children[index])
  }

  for (const node of nodes) {
    const isImageDefinition = node.type === 'definition'
      && imageReferenceIdentifiers.has(node.identifier)
    if ((node.type !== 'link' && node.type !== 'definition')
      || isImageDefinition) {
      continue
    }

    const target = resolveLegacyLinkTarget(node.url, links, sourcePath)
    const span = target ? findDestinationSpan(markdown, node) : null
    if (span)
      replacements.push({ ...span, value: target })
  }

  return replacements.sort((left, right) => right.start - left.start)
}

export function parseLegacyArticle(source, sourcePath) {
  if (typeof source !== 'string')
    throw migrationError(sourcePath, 'article source must be a string')
  if (!sourcePath)
    throw migrationError(String(sourcePath), 'source path is required')

  const normalizedSource = source.replace(/^\uFEFF/, '')
  const frontmatterMatch = normalizedSource.match(
    /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/,
  )

  if (!frontmatterMatch) {
    return {
      sourcePath,
      frontmatter: {},
      body: normalizedSource,
    }
  }

  return {
    sourcePath,
    frontmatter: parseFrontmatter(frontmatterMatch[1], sourcePath),
    body: normalizedSource.slice(frontmatterMatch[0].length),
  }
}

export function createArticleRecord(parsed, options = {}) {
  const sourcePath = parsed?.sourcePath ?? '<unknown>'
  if (!parsed || typeof parsed.body !== 'string' || !parsed.frontmatter)
    throw migrationError(sourcePath, 'parsed article is invalid')

  const category = findCategory(sourcePath)
  if (!category)
    throw migrationError(sourcePath, 'unable to determine article category')

  const normalizedPath = sourcePath.replaceAll('\\', '/')
  const fileName = normalizedPath.split('/').at(-1) ?? ''
  const id = fileName.replace(/\.md$/i, '')
  if (!id || id === fileName)
    throw migrationError(sourcePath, 'unable to determine article id')

  let markdownTree
  try {
    markdownTree = fromMarkdown(parsed.body)
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw migrationError(sourcePath, `unable to parse Markdown: ${message}`)
  }

  const frontmatterTitle = typeof parsed.frontmatter.title === 'string'
    ? parsed.frontmatter.title.trim()
    : ''
  const title = frontmatterTitle || findFirstHeading(markdownTree)
  if (!title)
    throw migrationError(sourcePath, 'unable to recover article title')

  let date = normalizeDate(parsed.frontmatter.date)
  if (!date && typeof options.resolveFirstCommitDate === 'function') {
    try {
      date = normalizeDate(options.resolveFirstCommitDate(sourcePath))
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw migrationError(sourcePath, message)
    }
  }
  if (!date)
    throw migrationError(sourcePath, 'unable to recover article date')

  const legacyBasePath = `/${category.legacyDirectory}/${id}`

  return {
    sourcePath,
    id,
    path: `/articles/${category.slug}/${id}`,
    title,
    description: createDescription(markdownTree, title),
    date,
    category: category.slug,
    categoryLabel: category.label,
    tags: normalizeTags(parsed.frontmatter.tags),
    legacyPaths: [`${legacyBasePath}.html`, legacyBasePath],
    draft: false,
    body: parsed.body,
  }
}

export function serializeMigratedArticle(record) {
  const sourcePath = record?.sourcePath ?? '<unknown>'
  const requiredStringFields = [
    'title',
    'description',
    'date',
    'category',
    'categoryLabel',
  ]
  for (const field of requiredStringFields) {
    if (typeof record?.[field] !== 'string' || !record[field])
      throw migrationError(sourcePath, `cannot serialize article without ${field}`)
  }
  if (!Array.isArray(record.tags) || !Array.isArray(record.legacyPaths))
    throw migrationError(sourcePath, 'cannot serialize article with invalid arrays')

  const lines = [
    '---',
    `title: ${quoteYamlString(record.title)}`,
    `description: ${quoteYamlString(record.description)}`,
    `date: ${quoteYamlString(record.date)}`,
    `category: ${quoteYamlString(record.category)}`,
    `categoryLabel: ${quoteYamlString(record.categoryLabel)}`,
  ]

  if (record.tags.length) {
    lines.push('tags:')
    for (const tag of record.tags)
      lines.push(`  - ${quoteYamlString(tag)}`)
  }
  else {
    lines.push('tags: []')
  }

  lines.push('legacyPaths:')
  for (const legacyPath of record.legacyPaths)
    lines.push(`  - ${quoteYamlString(legacyPath)}`)
  lines.push('draft: false', '---')

  return `${lines.join('\n')}\n${record.body ?? ''}`
}

export function rewriteLegacyLinks(markdown, manifest, sourcePath = '') {
  if (typeof markdown !== 'string')
    throw new TypeError('markdown must be a string')

  const links = createLinkMap(manifest)
  let tree
  try {
    tree = fromMarkdown(markdown)
  }
  catch {
    return markdown
  }

  const replacements = collectLinkReplacements(
    markdown,
    tree,
    links,
    sourcePath,
  )
  let rewritten = markdown
  for (const replacement of replacements) {
    rewritten = rewritten.slice(0, replacement.start)
      + replacement.value
      + rewritten.slice(replacement.end)
  }

  return rewritten
}
