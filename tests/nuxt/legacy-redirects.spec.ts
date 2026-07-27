import {
  createApp,
  eventHandler,
  toWebHandler,
} from 'h3'
import { describe, expect, it } from 'vitest'

import legacyRedirectMiddleware from '../../server/middleware/legacy-redirects'

function createTestHandler() {
  const app = createApp()
  app.use(legacyRedirectMiddleware)
  app.use(eventHandler(() => 'next-handler'))

  return toWebHandler(app)
}

describe('legacy redirect middleware', () => {
  it('returns a real 301 response for an exact legacy article URL', async () => {
    const response = await createTestHandler()(
      new Request('https://blog.example/accumulate/vue/21.html'),
    )

    expect(response.status).toBe(301)
    expect(response.headers.get('location')).toBe('/articles/vue/21')
  })

  it('returns an empty 301 response for a HEAD request to a legacy article URL', async () => {
    const response = await createTestHandler()(
      new Request('https://blog.example/accumulate/vue/21.html', {
        method: 'HEAD',
      }),
    )

    expect(response.status).toBe(301)
    expect(response.headers.get('location')).toBe('/articles/vue/21')
    expect(await response.text()).toBe('')
  })

  it('preserves the original query string in Location', async () => {
    const response = await createTestHandler()(
      new Request(
        'https://blog.example/accumulate/vue/21.html?utm_source=old&ref=%E4%B8%AD%E6%96%87',
      ),
    )

    expect(response.status).toBe(301)
    expect(response.headers.get('location')).toBe(
      '/articles/vue/21?utm_source=old&ref=%E4%B8%AD%E6%96%87',
    )
  })

  it('lets an unknown URL continue to the next handler', async () => {
    const response = await createTestHandler()(
      new Request('https://blog.example/accumulate/vue/999.html'),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
    expect(await response.text()).toBe('next-handler')
  })

  it.each(['POST', 'OPTIONS'])(
    'lets a %s request to a legacy URL continue to the next handler',
    async (method) => {
      const response = await createTestHandler()(
        new Request('https://blog.example/accumulate/vue/21.html', {
          method,
        }),
      )

      expect(response.status).toBe(200)
      expect(response.headers.get('location')).toBeNull()
      expect(await response.text()).toBe('next-handler')
    },
  )

  it.each([
    '/accumulate//vue/21.html',
    '/accumulate/vue/%2532%2531.html',
    '/accumulate/vue/21.html?next=%0d%0aLocation:%20https://evil.example',
  ])('does not redirect unsafe input: %s', async (path) => {
    const response = await createTestHandler()(
      new Request(`https://blog.example${path}`),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
    expect(await response.text()).toBe('next-handler')
  })
})
