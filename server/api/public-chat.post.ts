import { createError, defineEventHandler, readBody } from 'h3'

function getQuestion(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return undefined
  }

  const { question } = body as { question?: unknown }
  return typeof question === 'string' && question.trim() ? question.trim() : undefined
}

export default defineEventHandler(async (event) => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const question = getQuestion(await readBody(event))
  if (!question) {
    throw createError({ statusCode: 400, statusMessage: 'question is required' })
  }

  let upstream: Response
  try {
    upstream = await fetch(useRuntimeConfig(event).public.knowflowPublicChatUrl, {
      body: JSON.stringify({ question }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
  }
  catch {
    throw createError({ statusCode: 502, statusMessage: 'KnowFlow service is unavailable' })
  }

  if (!upstream.ok || !upstream.body) {
    throw createError({ statusCode: 502, statusMessage: 'KnowFlow service returned an invalid response' })
  }

  return new Response(upstream.body, {
    headers: {
      'Cache-Control': 'no-cache, no-transform',
      'Content-Type': upstream.headers.get('content-type') ?? 'text/event-stream; charset=utf-8',
      'X-Accel-Buffering': 'no',
    },
  })
})
