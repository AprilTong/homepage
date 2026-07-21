import type { ChatClient, ChatStreamEvent } from '../types/chat'

const DEMO_ANSWER = '这是首页布局阶段的演示回答。真实接入后，我会从 April 的知识库检索内容，并在这里流式展示答案与引用来源。'
const CHUNK_DELAY_MS = 45
const MAX_CHUNK_SIZE = 8

function createAbortError() {
  return new DOMException('生成已停止', 'AbortError')
}

function waitForNextChunk(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(createAbortError())
      return
    }

    const timer = setTimeout(() => {
      signal.removeEventListener('abort', handleAbort)
      resolve()
    }, CHUNK_DELAY_MS)
    const handleAbort = () => {
      clearTimeout(timer)
      reject(createAbortError())
    }

    signal.addEventListener('abort', handleAbort, { once: true })
  })
}

export function createDemoChatClient(): ChatClient {
  return {
    async *streamAnswer(_question, signal): AsyncIterable<ChatStreamEvent> {
      let offset = 0

      while (offset < DEMO_ANSWER.length) {
        await waitForNextChunk(signal)

        const chunkSize = Math.floor(Math.random() * MAX_CHUNK_SIZE) + 1
        const delta = DEMO_ANSWER.slice(offset, offset + chunkSize)
        offset += delta.length
        yield { type: 'delta', delta }
      }

      if (signal.aborted) {
        throw createAbortError()
      }

      yield {
        type: 'done',
        citations: [{
          id: 'demo-source',
          title: 'April 的知识库',
          excerpt: '真实接口将在后续阶段接入。',
        }],
      }
    },
  }
}
