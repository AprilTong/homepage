import {
  defineEventHandler,
  getMethod,
  getRequestURL,
  sendRedirect,
} from 'h3'

import { findLegacyRedirect } from '#server/utils/legacy-redirect'

const unsafeQueryPattern = /[\u0000-\u001f\u007f]/

function isSafeQuery(search: string): boolean {
  if (!search) {
    return true
  }

  try {
    const decodedSearch = decodeURIComponent(search)

    return (
      !unsafeQueryPattern.test(decodedSearch)
      && !/%(?:0d|0a)/i.test(decodedSearch)
    )
  } catch {
    return false
  }
}

export default defineEventHandler((event) => {
  const method = getMethod(event)

  if (method !== 'GET' && method !== 'HEAD') {
    return
  }

  const url = getRequestURL(event)
  const target = findLegacyRedirect(url.pathname)

  if (!target || !isSafeQuery(url.search)) {
    return
  }

  return sendRedirect(event, `${target}${url.search}`, 301)
})
