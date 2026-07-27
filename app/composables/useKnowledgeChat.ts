import { computed, reactive, ref } from 'vue'

import { createKnowflowChatClient } from '../services/knowflow-chat-client'
import { resolveKnowflowChatEndpoint } from '../services/knowflow-chat-endpoint'
import { PublicChatError } from '../types/chat'
import type { ChatClient, ChatMessage, ChatStatus } from '../types/chat'

const FALLBACK_ERROR_MESSAGE = '生成回答时发生错误'

export function createId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function getErrorMessage(error: unknown) {
  return error instanceof PublicChatError ? error.publicMessage : FALLBACK_ERROR_MESSAGE
}

export function useKnowledgeChat(client?: ChatClient) {
  const resolvedClient = client
    ?? createKnowflowChatClient(resolveKnowflowChatEndpoint(
      useRuntimeConfig().public.knowflowPublicChatUrl,
      import.meta.dev,
    ))
  const messages = ref<ChatMessage[]>([])
  const status = ref<ChatStatus>('idle')
  const errorMessage = ref('')
  const isStreaming = computed(() => status.value === 'streaming')

  let activeController: AbortController | undefined
  let activeAssistant: ChatMessage | undefined

  async function sendMessage(input: string) {
    const question = input.trim()
    if (!question || status.value === 'streaming') {
      return
    }

    const controller = new AbortController()
    const assistant = reactive<ChatMessage>({
      id: createId(),
      role: 'assistant',
      content: '',
      status: 'streaming',
    })

    activeController = controller
    activeAssistant = assistant
    errorMessage.value = ''
    status.value = 'streaming'
    messages.value.push({
      id: createId(),
      role: 'user',
      content: question,
      status: 'complete',
    }, assistant)

    try {
      for await (const event of resolvedClient.streamAnswer(question, controller.signal)) {
        if (controller.signal.aborted) {
          break
        }

        if (event.type === 'delta') {
          assistant.content += event.delta
        }
        else {
          assistant.citations = event.citations
          assistant.status = 'complete'
          break
        }
      }

      if (controller.signal.aborted) {
        assistant.status = 'stopped'
      }
      else {
        if (assistant.status === 'streaming') {
          assistant.status = 'error'
          errorMessage.value = FALLBACK_ERROR_MESSAGE
          status.value = 'error'
          return
        }
        status.value = 'idle'
      }
    }
    catch (error) {
      if (controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
        assistant.status = 'stopped'
        if (activeController === controller) {
          status.value = 'idle'
        }
      }
      else {
        assistant.status = 'error'
        errorMessage.value = getErrorMessage(error)
        status.value = 'error'
      }
    }
    finally {
      if (activeController === controller) {
        activeController = undefined
        activeAssistant = undefined
      }
    }
  }

  function stopGenerating() {
    if (status.value !== 'streaming') {
      return
    }

    activeController?.abort()
    if (activeAssistant) {
      activeAssistant.status = 'stopped'
    }
    status.value = 'idle'
  }

  async function retryLastMessage() {
    if (status.value === 'streaming') {
      return
    }

    const assistantIndex = messages.value.findLastIndex(message => (
      message.role === 'assistant' && message.status === 'error'
    ))
    if (assistantIndex < 0) {
      return
    }

    const userIndex = messages.value.findLastIndex((message, index) => (
      index < assistantIndex && message.role === 'user'
    ))
    if (userIndex < 0) {
      return
    }

    const question = messages.value[userIndex]!.content
    messages.value.splice(assistantIndex, 1)
    messages.value.splice(userIndex, 1)
    await sendMessage(question)
  }

  return {
    messages,
    status,
    errorMessage,
    isStreaming,
    sendMessage,
    stopGenerating,
    retryLastMessage,
  }
}
