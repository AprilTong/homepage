import { afterEach, describe, expect, it, vi } from 'vitest'

import { createKnowflowChatClient } from '../../app/services/knowflow-chat-client'

describe('KnowFlow public chat client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts a question and translates SSE deltas and citations into chat events', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response([
      'event: start\n',
      'data: {"citations":[{"id":"source-1","title":"文章","excerpt":"片段"}]}\n\n',
      'event: delta\n',
      'data: {"delta":"第一段"}\n\n',
      'event: delta\n',
      'data: {"delta":"第二段"}\n\n',
      'event: done\n',
      'data: {"citations":[{"id":"source-1","title":"文章","excerpt":"片段"}]}\n\n',
    ].join(''), {
      headers: { 'Content-Type': 'text/event-stream' },
    }))
    vi.stubGlobal('fetch', fetch)
    const client = createKnowflowChatClient('https://api.example.com/api/v1/public/chat/stream')

    const events = []
    for await (const event of client.streamAnswer('  如何使用知识库？  ', new AbortController().signal)) {
      events.push(event)
    }

    expect(fetch).toHaveBeenCalledWith(
      'https://api.example.com/api/v1/public/chat/stream',
      expect.objectContaining({
        body: JSON.stringify({ question: '如何使用知识库？' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }),
    )
    expect(events).toEqual([
      { type: 'delta', delta: '第一段' },
      { type: 'delta', delta: '第二段' },
      {
        type: 'done',
        citations: [{ id: 'source-1', title: '文章', excerpt: '片段' }],
      },
    ])
  })
})
