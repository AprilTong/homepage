import { describe, expect, it } from 'vitest'

import {
  KNOWFLOW_LOCAL_PROXY_ENDPOINT,
  resolveKnowflowChatEndpoint,
} from '../../app/services/knowflow-chat-endpoint'

describe('KnowFlow chat endpoint resolver', () => {
  it('uses the same-origin proxy during local development', () => {
    expect(resolveKnowflowChatEndpoint(
      'https://api.example.com/api/v1/public/chat/stream',
      true,
    )).toBe(KNOWFLOW_LOCAL_PROXY_ENDPOINT)
  })

  it('keeps the public KnowFlow endpoint in production', () => {
    const endpoint = 'https://api.example.com/api/v1/public/chat/stream'

    expect(resolveKnowflowChatEndpoint(endpoint, false)).toBe(endpoint)
  })
})
