import { PublicChatError, type ChatCitation, type ChatClient, type ChatStreamEvent } from '../types/chat'

export function createKnowflowChatClient(endpoint: string): ChatClient {
  return {
    async *streamAnswer(question, signal): AsyncIterable<ChatStreamEvent> {
      let response: Response

      try {
        response = await fetch(endpoint, {
          body: JSON.stringify({ question: question.trim() }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
          signal,
        })
      }
      catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw error
        }

        throw new PublicChatError('网络连接失败，请稍后重试。')
      }

      if (!response.ok) {
        throw new PublicChatError(response.status === 429
          ? '请求过于频繁，请稍后再试。'
          : '知识库暂时不可用，请稍后再试。')
      }

      if (!response.body) {
        throw new PublicChatError('知识库未返回流式响应，请稍后重试。')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let citations: ChatCitation[] | undefined
      let receivedDoneEvent = false

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const parsed = parseSseBuffer(buffer)
        buffer = parsed.buffer

        for (const event of parsed.events) {
          if (event.type === 'start') {
            citations = event.citations ?? citations
          }
          else if (event.type === 'delta') {
            yield event
          }
          else if (event.type === 'done') {
            receivedDoneEvent = true
            yield { type: 'done', citations: event.citations ?? citations }
          }
          else {
            throw new PublicChatError(event.message)
          }
        }
      }

      buffer += decoder.decode()
      if (buffer.trim()) {
        const parsed = parseSseBuffer(`${buffer}\n\n`)

        for (const event of parsed.events) {
          if (event.type === 'delta') {
            yield event
          }
          else if (event.type === 'done') {
            receivedDoneEvent = true
            yield { type: 'done', citations: event.citations ?? citations }
          }
          else if (event.type === 'error') {
            throw new PublicChatError(event.message)
          }
        }
      }

      if (!receivedDoneEvent) {
        throw new PublicChatError('生成响应中断，请重试。')
      }
    },
  }
}

type ParsedSseEvent =
  | { type: 'start'; citations?: ChatCitation[] }
  | { type: 'delta'; delta: string }
  | { type: 'done'; citations?: ChatCitation[] }
  | { type: 'error'; message: string }

function parseSseBuffer(buffer: string) {
  const blocks = buffer.split(/\r?\n\r?\n/)
  const restBuffer = blocks.pop() ?? ''
  const events = blocks.map(parseSseEvent).filter((event): event is ParsedSseEvent => Boolean(event))

  return { buffer: restBuffer, events }
}

function parseSseEvent(block: string): ParsedSseEvent | undefined {
  const eventName = block.match(/^event:\s*(.+)$/m)?.[1]?.trim()
  const data = block.match(/^data:\s*(.+)$/m)?.[1]

  if (!eventName || !data) {
    return undefined
  }

  let payload: unknown
  try {
    payload = JSON.parse(data)
  }
  catch {
    return { type: 'error', message: '知识库返回了无法识别的数据。' }
  }

  if (eventName === 'delta' && isRecord(payload) && typeof payload.delta === 'string') {
    return { type: 'delta', delta: payload.delta }
  }

  if (eventName === 'start' || eventName === 'done') {
    const citations = isRecord(payload) ? parseCitations(payload.citations) : undefined
    return { type: eventName, citations }
  }

  if (eventName === 'error') {
    return {
      type: 'error',
      message: isRecord(payload) && typeof payload.message === 'string'
        ? payload.message
        : '知识库暂时不可用，请稍后再试。',
    }
  }

  return undefined
}

function parseCitations(value: unknown): ChatCitation[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  return value.flatMap((citation) => {
    if (!isRecord(citation)
      || typeof citation.id !== 'string'
      || typeof citation.title !== 'string'
      || typeof citation.excerpt !== 'string') {
      return []
    }

    return [{ id: citation.id, title: citation.title, excerpt: citation.excerpt }]
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
