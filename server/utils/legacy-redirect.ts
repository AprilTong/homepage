import legacyRedirects from '#server/data/legacy-redirects.json'

const redirects = legacyRedirects as Record<string, string>
const unsafePathPattern = /[\u0000-\u001f\u007f\\]/
const encodedPathSeparatorPattern = /%(?:2f|5c)/i

export function normalizeLegacyPath(path: string): string {
  if (typeof path !== 'string' || !path.startsWith('/')) {
    return ''
  }

  const pathEnd = path.search(/[?#]/)
  const rawPath = pathEnd === -1 ? path : path.slice(0, pathEnd)

  if (encodedPathSeparatorPattern.test(rawPath)) {
    return ''
  }

  let decodedPath: string

  try {
    decodedPath = decodeURIComponent(rawPath)
  } catch {
    return ''
  }

  if (
    unsafePathPattern.test(decodedPath)
    || decodedPath.includes('//')
  ) {
    return ''
  }

  if (decodedPath.length > 1 && decodedPath.endsWith('/')) {
    return decodedPath.slice(0, -1)
  }

  return decodedPath
}

export function findLegacyRedirect(path: string): string | null {
  const normalizedPath = normalizeLegacyPath(path)

  if (!normalizedPath || !Object.hasOwn(redirects, normalizedPath)) {
    return null
  }

  const target = redirects[normalizedPath]

  if (
    typeof target !== 'string'
    || !target.startsWith('/articles/')
    || unsafePathPattern.test(target)
    || target.includes('//')
    || /[?#]/.test(target)
  ) {
    return null
  }

  return target
}
