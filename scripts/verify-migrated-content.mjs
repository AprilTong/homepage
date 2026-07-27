#!/usr/bin/env node

import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
} from 'node:fs'
import {
  dirname,
  isAbsolute,
  join,
  posix as posixPath,
  relative,
  resolve,
  sep,
} from 'node:path'
import { fileURLToPath } from 'node:url'

import { fromMarkdown } from 'mdast-util-from-markdown'
import { parseFragment } from 'parse5'

import categories from '../shared/article-categories.json' with { type: 'json' }
import { rewriteLegacyLinks } from './lib/legacy-content.mjs'

const EXPECTED_ARTICLE_COUNT = 100
const SAFE_RAW_HTML_ELEMENTS = new Set([
  'a',
  'abbr',
  'address',
  'b',
  'bdi',
  'bdo',
  'blockquote',
  'br',
  'caption',
  'center',
  'cite',
  'code',
  'col',
  'colgroup',
  'dd',
  'del',
  'details',
  'dfn',
  'div',
  'dl',
  'dt',
  'em',
  'figcaption',
  'figure',
  'font',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'ins',
  'kbd',
  'li',
  'mark',
  'ol',
  'p',
  'pre',
  'q',
  'rp',
  'rt',
  'ruby',
  's',
  'samp',
  'small',
  'span',
  'strong',
  'sub',
  'summary',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'time',
  'tr',
  'u',
  'ul',
  'var',
  'wbr',
])
const SAFE_RAW_HTML_GLOBAL_ATTRIBUTES = new Set([
  'class',
  'dir',
  'hidden',
  'id',
  'lang',
  'role',
  'tabindex',
  'title',
])
const SAFE_RAW_HTML_ATTRIBUTES = new Map([
  ['a', new Set([
    'download',
    'href',
    'hreflang',
    'name',
    'referrerpolicy',
    'rel',
    'target',
    'type',
  ])],
  ['blockquote', new Set(['cite'])],
  ['col', new Set(['align', 'char', 'charoff', 'span', 'valign', 'width'])],
  ['colgroup', new Set([
    'align',
    'char',
    'charoff',
    'span',
    'valign',
    'width',
  ])],
  ['del', new Set(['cite', 'datetime'])],
  ['details', new Set(['open'])],
  ['div', new Set(['align'])],
  ['font', new Set(['color', 'face', 'size'])],
  ['h1', new Set(['align'])],
  ['h2', new Set(['align'])],
  ['h3', new Set(['align'])],
  ['h4', new Set(['align'])],
  ['h5', new Set(['align'])],
  ['h6', new Set(['align'])],
  ['hr', new Set(['align', 'color', 'noshade', 'size', 'width'])],
  ['img', new Set([
    'alt',
    'crossorigin',
    'decoding',
    'height',
    'loading',
    'referrerpolicy',
    'sizes',
    'src',
    'srcset',
    'width',
  ])],
  ['ins', new Set(['cite', 'datetime'])],
  ['li', new Set(['value'])],
  ['ol', new Set(['reversed', 'start', 'type'])],
  ['p', new Set(['align'])],
  ['q', new Set(['cite'])],
  ['table', new Set([
    'align',
    'border',
    'cellpadding',
    'cellspacing',
    'frame',
    'rules',
    'summary',
    'width',
  ])],
  ['tbody', new Set(['align', 'char', 'charoff', 'valign'])],
  ['td', new Set([
    'abbr',
    'align',
    'char',
    'charoff',
    'colspan',
    'headers',
    'height',
    'rowspan',
    'scope',
    'valign',
    'width',
  ])],
  ['tfoot', new Set(['align', 'char', 'charoff', 'valign'])],
  ['th', new Set([
    'abbr',
    'align',
    'char',
    'charoff',
    'colspan',
    'headers',
    'height',
    'rowspan',
    'scope',
    'valign',
    'width',
  ])],
  ['thead', new Set(['align', 'char', 'charoff', 'valign'])],
  ['time', new Set(['datetime'])],
  ['tr', new Set(['align', 'char', 'charoff', 'valign'])],
])
const RAW_HTML_URL_ATTRIBUTES = new Set([
  'cite',
  'href',
  'src',
])
const SAFE_RAW_HTML_URL_SCHEMES = new Set([
  'http',
  'https',
  'mailto',
  'tel',
])
const scriptPath = fileURLToPath(import.meta.url)
const defaultProjectRoot = resolve(dirname(scriptPath), '..')

function fail(message) {
  throw new Error(message)
}

function readJson(path, label) {
  if (!existsSync(path))
    fail(`${label} does not exist: ${path}`)

  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    fail(`${label} is not valid JSON: ${message}`)
  }
}

function requireString(entry, field) {
  if (typeof entry[field] !== 'string' || !entry[field].trim())
    fail(`${entry.sourcePath ?? '<unknown>'}: ${field} must be a non-empty string`)
}

function requireStringArray(entry, field) {
  if (!Array.isArray(entry[field])
    || entry[field].some(value => typeof value !== 'string')) {
    fail(`${entry.sourcePath ?? '<unknown>'}: ${field} must be a string array`)
  }
}

function assertUnique(entries, select, label) {
  const seen = new Map()
  for (const entry of entries) {
    for (const value of select(entry)) {
      const previous = seen.get(value)
      if (previous)
        fail(`${label} "${value}" is shared by ${previous} and ${entry.sourcePath}`)
      seen.set(value, entry.sourcePath)
    }
  }
}

function validateManifest(manifest) {
  if (!Array.isArray(manifest))
    fail('Migration manifest must be an array')
  if (manifest.length !== EXPECTED_ARTICLE_COUNT) {
    fail(
      `Migration manifest must contain ${EXPECTED_ARTICLE_COUNT} articles; found ${manifest.length}`,
    )
  }

  const categoryBySlug = new Map(
    categories.map(category => [category.slug, category]),
  )
  for (const entry of manifest) {
    for (const field of [
      'sourcePath',
      'newPath',
      'title',
      'description',
      'date',
      'category',
      'categoryLabel',
    ]) {
      requireString(entry, field)
    }
    requireStringArray(entry, 'tags')
    requireStringArray(entry, 'legacyPaths')

    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date))
      fail(`${entry.sourcePath}: invalid date ${entry.date}`)
    if (!/^\/articles\/[^/]+\/[^/]+$/.test(entry.newPath))
      fail(`${entry.sourcePath}: invalid newPath ${entry.newPath}`)

    const category = categoryBySlug.get(entry.category)
    if (!category)
      fail(`${entry.sourcePath}: invalid category ${entry.category}`)
    if (entry.categoryLabel !== category.label)
      fail(`${entry.sourcePath}: categoryLabel does not match ${entry.category}`)
    if (entry.draft !== false)
      fail(`${entry.sourcePath}: migrated articles must not be drafts`)
    if (entry.legacyPaths.length !== 2)
      fail(`${entry.sourcePath}: expected exactly two legacyPaths`)
    if (!Array.isArray(entry.localResources))
      fail(`${entry.sourcePath}: localResources must be an array`)
    if (!Array.isArray(entry.missingLocalResources))
      fail(`${entry.sourcePath}: missingLocalResources must be an array`)
    if (entry.missingLocalResources.length) {
      fail(
        `${entry.sourcePath}: missing local resources: ${entry.missingLocalResources.join(', ')}`,
      )
    }
    if (!entry.filledFields
      || Array.isArray(entry.filledFields)
      || typeof entry.filledFields !== 'object') {
      fail(`${entry.sourcePath}: invalid filledFields`)
    }
    for (const [field, source] of Object.entries(entry.filledFields)) {
      const validSource = field === 'title'
        ? source === 'markdown-heading' || source === 'manual-override'
        : field === 'date'
          ? source === 'git-first-commit'
          : false
      if (!validSource)
        fail(`${entry.sourcePath}: invalid filledFields`)
    }
    if (typeof entry.sourceHash !== 'string'
      || !/^[a-f0-9]{64}$/.test(entry.sourceHash)) {
      fail(`${entry.sourcePath}: invalid sourceHash`)
    }
  }

  assertUnique(manifest, entry => [entry.sourcePath], 'sourcePath')
  assertUnique(manifest, entry => [entry.newPath], 'newPath')
  assertUnique(manifest, entry => entry.legacyPaths, 'legacyPath')

  const migratedCategories = new Set(manifest.map(entry => entry.category))
  for (const category of categories) {
    if (!migratedCategories.has(category.slug))
      fail(`Category ${category.slug} has no migrated articles`)
  }
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

function isExternalOrAnchor(url) {
  return !url
    || url.startsWith('#')
    || url.startsWith('?')
    || url.startsWith('//')
    || /^[A-Za-z][A-Za-z\d+.-]*:/.test(url)
}

function urlPath(url) {
  const suffixIndex = url.search(/[?#]/)
  const pathname = suffixIndex === -1 ? url : url.slice(0, suffixIndex)
  try {
    return decodeURI(pathname)
  }
  catch {
    return null
  }
}

function outputFile(entry, projectRoot) {
  return join(projectRoot, 'content', `${entry.newPath}.md`)
}

function listMarkdownFiles(directory) {
  if (!existsSync(directory) || !statSync(directory).isDirectory())
    return []

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory())
      return listMarkdownFiles(path)
    return entry.isFile() && entry.name.endsWith('.md') ? [path] : []
  })
}

function validateSymlinkFreeTree(path, label) {
  let stats
  try {
    stats = lstatSync(path)
  }
  catch (error) {
    if (error?.code === 'ENOENT')
      return
    throw error
  }
  if (stats.isSymbolicLink())
    fail(`${label} contains a symbolic link: ${path}`)
  if (!stats.isDirectory())
    return

  for (const entry of readdirSync(path))
    validateSymlinkFreeTree(join(path, entry), label)
}

function validateFixedTargetAncestors(projectRoot) {
  const relativeTargets = [
    'content/articles',
    'content/migration-manifest.json',
    'server/data/legacy-redirects.json',
    'public/articles',
  ]

  for (const relativeTarget of relativeTargets) {
    let cursor = projectRoot
    for (const segment of relativeTarget.split('/')) {
      cursor = join(cursor, segment)
      let stats
      try {
        stats = lstatSync(cursor)
      }
      catch (error) {
        if (error?.code === 'ENOENT')
          continue
        throw error
      }
      if (stats.isSymbolicLink()) {
        fail(`Migration target has a symbolic link ancestor: ${cursor}`)
      }
    }
  }
}

function parseFrontmatterScalar(value, entry) {
  if (value === 'false')
    return false
  if (value === 'true')
    return true
  if (value === '[]')
    return []

  try {
    return JSON.parse(value)
  }
  catch {
    fail(`${entry.sourcePath}: generated frontmatter contains an invalid scalar`)
  }
}

function parseGeneratedFrontmatter(entry, source) {
  const frontmatter = source.match(
    /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/,
  )?.[1]
  if (frontmatter === undefined)
    fail(`${entry.sourcePath}: generated Markdown has no frontmatter`)

  const metadata = {}
  const lines = frontmatter.split(/\r?\n/)
  for (let index = 0; index < lines.length; index += 1) {
    const property = lines[index].match(/^([A-Za-z][\w-]*):(?: (.*))?$/)
    if (!property)
      fail(`${entry.sourcePath}: invalid generated frontmatter line`)

    const [, key, scalar] = property
    if (scalar !== undefined) {
      metadata[key] = parseFrontmatterScalar(scalar, entry)
      continue
    }

    const values = []
    while (index + 1 < lines.length) {
      const item = lines[index + 1].match(/^  - (.*)$/)
      if (!item)
        break
      index += 1
      values.push(parseFrontmatterScalar(item[1], entry))
    }
    metadata[key] = values
  }

  return { frontmatter, metadata }
}

function validateGeneratedFrontmatter(entry, source) {
  const { frontmatter, metadata } = parseGeneratedFrontmatter(entry, source)
  if (/^(?:sidebar|sidebarDepth):/m.test(frontmatter))
    fail(`${entry.sourcePath}: generated frontmatter contains VuePress sidebar config`)
  if (source.includes('OAuth Secret'))
    fail(`${entry.sourcePath}: generated Markdown contains an OAuth config marker`)
  if (/@vuepress\/plugin-|vuepress-plugin-/.test(source))
    fail(`${entry.sourcePath}: generated Markdown contains a VuePress plugin marker`)

  const expected = {
    title: entry.title,
    description: entry.description,
    date: entry.date,
    category: entry.category,
    categoryLabel: entry.categoryLabel,
    tags: entry.tags,
    legacyPaths: entry.legacyPaths,
    draft: false,
  }
  if (JSON.stringify(metadata) !== JSON.stringify(expected))
    fail(`${entry.sourcePath}: generated frontmatter does not match the manifest`)
}

function validateLegacyLinkRewrites(entry, source, manifest) {
  const frontmatter = source.match(
    /^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/,
  )
  if (!frontmatter)
    fail(`${entry.sourcePath}: generated Markdown has no frontmatter`)

  const body = source.slice(frontmatter[0].length)
  if (rewriteLegacyLinks(body, manifest, entry.sourcePath) !== body) {
    fail(
      `${entry.sourcePath}: relative legacy article link was not rewritten`,
    )
  }
}

function filesystemPathContains(parent, child) {
  const relation = relative(parent, child)
  return relation === ''
    || (!relation.startsWith(`..${sep}`)
      && relation !== '..'
      && !isAbsolute(relation))
}

function isPublicFile(projectRoot, pathname) {
  if (!pathname.startsWith('/') || pathname.includes('\\'))
    return false

  const publicRoot = join(projectRoot, 'public')
  const candidate = resolve(publicRoot, pathname.replace(/^\/+/, ''))
  if (!filesystemPathContains(publicRoot, candidate)
    || !existsSync(candidate)) {
    return false
  }

  const stats = lstatSync(candidate)
  if (stats.isSymbolicLink())
    fail(`Public article resource is a symbolic link: ${pathname}`)
  if (!stats.isFile())
    return false

  return filesystemPathContains(
    realpathSync(publicRoot),
    realpathSync(candidate),
  )
}

function decodeHtmlUrl(value) {
  return value
    .replace(/&colon;/gi, ':')
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);?/g, (_, decimal) =>
      String.fromCodePoint(Number.parseInt(decimal, 10)))
}

function isJavascriptUrl(url) {
  return decodeHtmlUrl(url)
    .replace(/[\u0000-\u0020]+/g, '')
    .toLowerCase()
    .startsWith('javascript:')
}

function assertSafeRawHtmlUrl(entry, url) {
  const normalized = decodeHtmlUrl(url)
    .replace(/[\u0000-\u0020]+/g, '')
  const scheme = normalized.match(/^([A-Za-z][A-Za-z\d+.-]*):/)?.[1]
  if (scheme && !SAFE_RAW_HTML_URL_SCHEMES.has(scheme.toLowerCase()))
    fail(`${entry.sourcePath}: unsafe HTML URL`)
}

function isAllowedRawHtmlAttribute(tagName, attributeName) {
  return SAFE_RAW_HTML_GLOBAL_ATTRIBUTES.has(attributeName)
    || /^aria-[a-z\d_.-]+$/.test(attributeName)
    || SAFE_RAW_HTML_ATTRIBUTES.get(tagName)?.has(attributeName) === true
}

function srcsetUrls(srcset) {
  const urls = []
  let cursor = 0

  while (cursor < srcset.length) {
    while (/[\s,]/.test(srcset[cursor] ?? ''))
      cursor += 1
    if (cursor >= srcset.length)
      break

    const start = cursor
    const isDataUrl = srcset.slice(start, start + 5).toLowerCase() === 'data:'
    while (cursor < srcset.length
      && !/\s/.test(srcset[cursor])
      && (isDataUrl || srcset[cursor] !== ',')) {
      cursor += 1
    }
    urls.push(srcset.slice(start, cursor))

    while (cursor < srcset.length && srcset[cursor] !== ',')
      cursor += 1
    if (srcset[cursor] === ',')
      cursor += 1
  }

  return urls.filter(Boolean)
}

function validateInternalDestination({
  entry,
  url,
  isImage,
  isRawHtml = false,
  articlePaths,
  legacyPaths,
  sourcePaths,
  projectRoot,
}) {
  if (isJavascriptUrl(url)) {
    fail(
      `${entry.sourcePath}: ${isRawHtml ? 'unsafe HTML' : 'unsafe Markdown URL'}: ${url}`,
    )
  }
  if (isExternalOrAnchor(url))
    return

  const pathname = urlPath(url)
  if (pathname === null)
    fail(`${entry.sourcePath}: invalid URL ${url}`)

  if (legacyPaths.has(pathname) || sourcePaths.has(pathname)) {
    fail(`${entry.sourcePath}: article link was not migrated: ${url}`)
  }
  if (pathname === '/' || pathname === '/articles'
    || articlePaths.has(pathname)) {
    return
  }

  if (pathname.startsWith('/')) {
    if (isPublicFile(projectRoot, pathname))
      return
    if (isRawHtml)
      fail(`${entry.sourcePath}: broken raw HTML URL: ${url}`)
    if (isImage)
      fail(`${entry.sourcePath}: broken image resource: ${url}`)
    fail(`${entry.sourcePath}: broken internal link: ${url}`)
  }

  const resolvedPath = posixPath.normalize(posixPath.join(
    '/',
    posixPath.dirname(entry.sourcePath),
    pathname,
  ))
  const knownArticle = legacyPaths.has(resolvedPath)
    || sourcePaths.has(resolvedPath)
    || articlePaths.has(resolvedPath)
  if (knownArticle) {
    fail(`${entry.sourcePath}: relative article link was not migrated: ${url}`)
  }
  if (isRawHtml)
    fail(`${entry.sourcePath}: broken raw HTML URL: ${url}`)
  if (isImage)
    fail(`${entry.sourcePath}: broken image resource: ${url}`)
  if (/\.(?:html|md)$/i.test(pathname))
    fail(`${entry.sourcePath}: broken relative article link: ${url}`)
  fail(`${entry.sourcePath}: broken internal link: ${url}`)
}

function validateRawHtml(
  entry,
  html,
  validationContext,
) {
  const fragment = parseFragment(html)
  const stack = [...(fragment.childNodes ?? [])]

  while (stack.length) {
    const node = stack.pop()
    const tagName = node.tagName?.toLowerCase()
    if (tagName && !SAFE_RAW_HTML_ELEMENTS.has(tagName))
      fail(`${entry.sourcePath}: unsafe HTML element: ${tagName}`)

    for (const attribute of node.attrs ?? []) {
      const name = attribute.prefix
        ? `${attribute.prefix}:${attribute.name}`.toLowerCase()
        : attribute.name.toLowerCase()
      if (name.startsWith('on') || name === 'srcdoc' || name === 'style')
        fail(`${entry.sourcePath}: unsafe HTML event attribute`)
      if (!isAllowedRawHtmlAttribute(tagName, name))
        fail(`${entry.sourcePath}: unsafe HTML attribute: ${name}`)

      const urls = name === 'srcset'
        ? srcsetUrls(attribute.value)
        : RAW_HTML_URL_ATTRIBUTES.has(name)
          ? [attribute.value]
          : []
      for (const url of urls) {
        assertSafeRawHtmlUrl(entry, url)
        validateInternalDestination({
          entry,
          url,
          isImage: tagName === 'img',
          isRawHtml: true,
          ...validationContext,
        })
      }
    }

    stack.push(...(node.childNodes ?? []))
    stack.push(...(node.content?.childNodes ?? []))
  }
}

function validateMarkdownLinks(
  entry,
  source,
  articlePaths,
  legacyPaths,
  sourcePaths,
  projectRoot,
) {
  let tree
  try {
    tree = fromMarkdown(source)
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    fail(`${entry.sourcePath}: invalid Markdown: ${message}`)
  }

  const nodes = collectMarkdownNodes(tree)
  const imageDefinitionIdentifiers = new Set(
    nodes
      .filter(node => node.type === 'imageReference')
      .map(node => node.identifier),
  )
  const linkDefinitionIdentifiers = new Set(
    nodes
      .filter(node => node.type === 'linkReference')
      .map(node => node.identifier),
  )
  const validationContext = {
    articlePaths,
    legacyPaths,
    sourcePaths,
    projectRoot,
  }

  for (const node of nodes) {
    if (node.type === 'html') {
      validateRawHtml(entry, node.value, validationContext)
      continue
    }
    if (!['image', 'link', 'definition'].includes(node.type))
      continue

    const isImage = node.type === 'image'
      || (node.type === 'definition'
        && imageDefinitionIdentifiers.has(node.identifier)
        && !linkDefinitionIdentifiers.has(node.identifier))
    validateInternalDestination({
      entry,
      url: node.url,
      isImage,
      ...validationContext,
    })
  }
}

function validateOutputs(manifest, projectRoot) {
  const articlePaths = new Set(manifest.map(entry => entry.newPath))
  const legacyPaths = new Set(manifest.flatMap(entry => entry.legacyPaths))
  const sourcePaths = new Set(
    manifest.map(entry => `/${entry.sourcePath.replace(/^\/+/, '')}`),
  )
  const articlesRoot = join(projectRoot, 'content/articles')
  const generatedPaths = listMarkdownFiles(articlesRoot).map(file =>
    `/articles/${relative(articlesRoot, file)
      .split(sep)
      .join('/')
      .replace(/\.md$/, '')}`,
  )
  if (generatedPaths.length !== EXPECTED_ARTICLE_COUNT
    || generatedPaths.length !== articlePaths.size
    || generatedPaths.some(path => !articlePaths.has(path))) {
    fail('generated Markdown set does not match the manifest')
  }

  for (const entry of manifest) {
    const file = outputFile(entry, projectRoot)
    if (!existsSync(file) || !statSync(file).isFile())
      fail(`${entry.sourcePath}: generated Markdown does not exist: ${file}`)

    const source = readFileSync(file, 'utf8')
    validateGeneratedFrontmatter(entry, source)
    validateLegacyLinkRewrites(entry, source, manifest)
    validateMarkdownLinks(
      entry,
      source,
      articlePaths,
      legacyPaths,
      sourcePaths,
      projectRoot,
    )

    for (const resource of entry.localResources) {
      requireString(resource, 'sourcePath')
      requireString(resource, 'publicPath')
      if (!resource.publicPath.startsWith(`${entry.newPath}/`)) {
        fail(`${entry.sourcePath}: resource is outside its article directory`)
      }
      const publicFile = join(projectRoot, 'public', resource.publicPath)
      if (!existsSync(publicFile) || !statSync(publicFile).isFile())
        fail(`${entry.sourcePath}: copied resource does not exist: ${resource.publicPath}`)
      if (!source.includes(resource.publicPath))
        fail(`${entry.sourcePath}: copied resource is not referenced: ${resource.publicPath}`)
    }
  }
}

function validateRedirects(manifest, redirects) {
  if (!redirects || Array.isArray(redirects) || typeof redirects !== 'object')
    fail('Legacy redirects must be an object')

  const expected = Object.fromEntries(
    manifest.flatMap(entry =>
      entry.legacyPaths.map(legacyPath => [legacyPath, entry.newPath]),
    ),
  )
  if (JSON.stringify(redirects) !== JSON.stringify(expected))
    fail('Legacy redirects do not exactly match the migration manifest')
}

function parseArguments(argv) {
  if (!argv.length)
    return defaultProjectRoot
  if (argv.length !== 2 || argv[0] !== '--root' || !argv[1])
    fail('Usage: verify-migrated-content [--root <project-root>]')
  return resolve(argv[1])
}

export function verifyMigration(projectRoot = defaultProjectRoot) {
  projectRoot = realpathSync(resolve(projectRoot))
  validateFixedTargetAncestors(projectRoot)
  const manifestPath = join(
    projectRoot,
    'content/migration-manifest.json',
  )
  const redirectsPath = join(
    projectRoot,
    'server/data/legacy-redirects.json',
  )
  validateSymlinkFreeTree(
    join(projectRoot, 'content/articles'),
    'Generated articles',
  )
  validateSymlinkFreeTree(
    join(projectRoot, 'public/articles'),
    'Public article resources',
  )
  const manifest = readJson(manifestPath, 'Migration manifest')
  const redirects = readJson(redirectsPath, 'Legacy redirects')
  validateManifest(manifest)
  validateOutputs(manifest, projectRoot)
  validateRedirects(manifest, redirects)
  return manifest.length
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(scriptPath)) {
  try {
    const count = verifyMigration(parseArguments(process.argv.slice(2)))
    process.stdout.write(`Verified ${count} migrated articles\n`)
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`Verification failed: ${message}\n`)
    process.exitCode = 1
  }
}
