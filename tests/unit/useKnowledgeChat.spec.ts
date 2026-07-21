import { describe, expect, it, vi } from 'vitest'

import { useKnowledgeChat } from '../../app/composables/useKnowledgeChat'
import { createDemoChatClient } from '../../app/services/demo-chat-client'
import type { ChatClient, ChatStreamEvent } from '../../app/types/chat'

function createDeferred() {
  let resolve!: () => void
  const promise = new Promise<void>((complete) => {
    resolve = complete
  })

  return { promise, resolve }
}

describe('useKnowledgeChat', () => {
  it('streams deltas into one assistant message and completes the answer', async () => {
    const citation = {
      id: 'source-1',
      title: '知识库条目',
      excerpt: '这是引用摘要。',
    }
    const client: ChatClient = {
      async *streamAnswer(): AsyncIterable<ChatStreamEvent> {
        yield { type: 'delta', delta: '你好，' }
        yield { type: 'delta', delta: '这是知识库回答。' }
        yield { type: 'done', citations: [citation] }
        yield { type: 'delta', delta: '不应继续追加' }
      },
    }
    const chat = useKnowledgeChat(client)

    await chat.sendMessage('  如何使用知识库？  ')

    expect(chat.messages.value).toHaveLength(2)
    expect(chat.messages.value[0]).toMatchObject({
      role: 'user',
      content: '如何使用知识库？',
      status: 'complete',
    })
    expect(chat.messages.value[1]).toMatchObject({
      role: 'assistant',
      content: '你好，这是知识库回答。',
      status: 'complete',
      citations: [citation],
    })
    expect(chat.status.value).toBe('idle')
  })

  it('ignores blank questions and rejects a second send while streaming', async () => {
    const release = createDeferred()
    const client: ChatClient = {
      async *streamAnswer(): AsyncIterable<ChatStreamEvent> {
        await release.promise
        yield { type: 'done' }
      },
    }
    const chat = useKnowledgeChat(client)

    await chat.sendMessage('   ')
    expect(chat.messages.value).toHaveLength(0)

    const firstRequest = chat.sendMessage('第一个问题')
    await chat.sendMessage('第二个问题')

    expect(chat.messages.value.filter(message => message.role === 'user')).toHaveLength(1)
    expect(chat.status.value).toBe('streaming')

    release.resolve()
    await firstRequest
    expect(chat.status.value).toBe('idle')
  })

  it('stops generation, retaining streamed content and returning to idle', async () => {
    const client: ChatClient = {
      async *streamAnswer(_question, signal): AsyncIterable<ChatStreamEvent> {
        yield { type: 'delta', delta: '已经生成' }

        await new Promise<void>((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            reject(new DOMException('已停止', 'AbortError'))
          }, { once: true })
        })
      },
    }
    const chat = useKnowledgeChat(client)
    const request = chat.sendMessage('请回答')

    await vi.waitFor(() => {
      expect(chat.messages.value.at(-1)?.content).toBe('已经生成')
    })
    chat.stopGenerating()
    await request

    expect(chat.messages.value.at(-1)).toMatchObject({
      role: 'assistant',
      content: '已经生成',
      status: 'stopped',
    })
    expect(chat.status.value).toBe('idle')
  })

  it('does not let a stopped request reset a newer streaming request', async () => {
    const releaseSecondRequest = createDeferred()
    let requestCount = 0
    const client: ChatClient = {
      async *streamAnswer(_question, signal): AsyncIterable<ChatStreamEvent> {
        requestCount += 1
        if (requestCount === 1) {
          yield { type: 'delta', delta: '旧回答' }
          await new Promise<void>((_resolve, reject) => {
            signal.addEventListener('abort', () => {
              reject(new DOMException('已停止', 'AbortError'))
            }, { once: true })
          })
          return
        }

        await releaseSecondRequest.promise
        yield { type: 'done' }
      },
    }
    const chat = useKnowledgeChat(client)
    const firstRequest = chat.sendMessage('旧问题')

    await vi.waitFor(() => {
      expect(chat.messages.value.at(-1)?.content).toBe('旧回答')
    })
    chat.stopGenerating()
    const secondRequest = chat.sendMessage('新问题')

    try {
      await firstRequest
      expect(chat.status.value).toBe('streaming')
    }
    finally {
      releaseSecondRequest.resolve()
      await secondRequest
    }
  })

  it('records errors and retries the last question without duplicating it', async () => {
    let attempt = 0
    const client: ChatClient = {
      async *streamAnswer(): AsyncIterable<ChatStreamEvent> {
        attempt += 1
        if (attempt === 1) {
          throw new Error('网络中断')
        }

        yield { type: 'delta', delta: '重试成功' }
        yield { type: 'done' }
      },
    }
    const chat = useKnowledgeChat(client)

    await chat.sendMessage('同一个问题')

    expect(chat.status.value).toBe('error')
    expect(chat.errorMessage.value).toBe('网络中断')
    expect(chat.messages.value.at(-1)?.status).toBe('error')

    await chat.retryLastMessage()

    expect(chat.messages.value.filter(message => message.role === 'user')).toHaveLength(1)
    expect(chat.messages.value.at(-1)).toMatchObject({
      role: 'assistant',
      content: '重试成功',
      status: 'complete',
    })
    expect(chat.errorMessage.value).toBe('')
    expect(chat.status.value).toBe('idle')
  })
})

describe('createDemoChatClient', () => {
  it('aborts a pending chunk delay without leaving timers or later events', async () => {
    vi.useFakeTimers()

    try {
      const controller = new AbortController()
      const iterator = createDemoChatClient()
        .streamAnswer('演示问题', controller.signal)
        [Symbol.asyncIterator]()
      const pendingEvent = iterator.next()

      expect(vi.getTimerCount()).toBe(1)
      controller.abort()

      await expect(pendingEvent).rejects.toMatchObject({ name: 'AbortError' })
      expect(vi.getTimerCount()).toBe(0)
      await expect(iterator.next()).resolves.toEqual({ done: true, value: undefined })
    }
    finally {
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })
})
