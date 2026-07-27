import { describe, expect, it } from 'vitest'

import {
  findLegacyRedirect,
  normalizeLegacyPath,
} from '../../server/utils/legacy-redirect'

describe('normalizeLegacyPath', () => {
  it('removes the query string and fragment without changing path casing', () => {
    expect(normalizeLegacyPath('/accumulate/vue/21.html?from=old#heading')).toBe(
      '/accumulate/vue/21.html',
    )
  })

  it('removes one trailing slash from a legacy article path', () => {
    expect(normalizeLegacyPath('/accumulate/vue/21/')).toBe(
      '/accumulate/vue/21',
    )
  })

  it('decodes a URL-encoded legacy path exactly once', () => {
    expect(normalizeLegacyPath('/accumulate/vue/%32%31.html')).toBe(
      '/accumulate/vue/21.html',
    )
    expect(normalizeLegacyPath('/accumulate/vue/%2532%2531.html')).toBe(
      '/accumulate/vue/%32%31.html',
    )
  })

  it.each([
    '/accumulate/vue/%E0%A4%A',
    '/accumulate//vue/21.html',
    '/accumulate\\vue\\21.html',
    '/accumulate/%5Cvue/21.html',
    '/accumulate%2Fvue/21.html',
    '/accumulate%2fvue/21.html',
    '/accumulate/vue/21.html%0d%0aLocation:%20https://evil.example',
  ])('rejects unsafe or malformed input: %s', (path) => {
    expect(normalizeLegacyPath(path)).toBe('')
  })
})

describe('findLegacyRedirect', () => {
  it.each([
    ['/accumulate/vue/21.html', '/articles/vue/21'],
    ['/accumulate/vue/21', '/articles/vue/21'],
    ['/accumulate/vue/21/', '/articles/vue/21'],
    ['/accumulate/vue/%32%31.html', '/articles/vue/21'],
  ])('maps %s to its exact manifest target', (path, expected) => {
    expect(findLegacyRedirect(path)).toBe(expected)
  })

  it.each([
    '/accumulate/vue/999.html',
    '/accumulate/Vue/21.html',
    '/ACCUMULATE/vue/21.html',
    '/articles/vue/21',
    '/accumulate//vue/21.html',
    '/accumulate\\vue\\21.html',
    '/accumulate/vue/%2532%2531.html',
    '/accumulate/vue/%E0%A4%A',
  ])('does not redirect an unknown or unsafe path: %s', (path) => {
    expect(findLegacyRedirect(path)).toBeNull()
  })

  it('ignores query and fragment data while resolving the mapped path', () => {
    expect(
      findLegacyRedirect('/accumulate/vue/21.html?utm_source=old#intro'),
    ).toBe('/articles/vue/21')
  })
})
