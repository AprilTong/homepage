export type ChatRole = 'user' | 'assistant'

export type ChatMessageStatus = 'complete' | 'streaming' | 'stopped' | 'error'

export type ChatStatus = 'idle' | 'streaming' | 'error'

export interface ChatCitation {
  id: string
  title: string
  excerpt: string
}

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  status: ChatMessageStatus
  citations?: ChatCitation[]
}

export type ChatStreamEvent =
  | { type: 'delta', delta: string }
  | { type: 'done', citations?: ChatCitation[] }

export interface ChatClient {
  streamAnswer: (question: string, signal: AbortSignal) => AsyncIterable<ChatStreamEvent>
}
