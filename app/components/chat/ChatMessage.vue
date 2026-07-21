<script setup lang="ts">
import type { ChatMessage } from '../../types/chat'

const props = defineProps<{
  message: ChatMessage
}>()

const copied = ref(false)
const copyError = ref('')

async function copyMessage() {
  copied.value = false
  copyError.value = ''

  const clipboard = typeof navigator === 'undefined'
    ? undefined
    : navigator.clipboard

  if (!clipboard || typeof clipboard.writeText !== 'function') {
    copyError.value = '复制失败，请手动复制'
    return
  }

  try {
    await clipboard.writeText(props.message.content)
    copied.value = true
  }
  catch {
    copyError.value = '复制失败，请手动复制'
  }
}
</script>

<template>
  <article
    :data-role="message.role"
    :class="['chat-message', `chat-message--${message.role}`]"
  >
    <span class="chat-message__label">
      {{ message.role === 'user' ? 'YOU' : 'APRIL AI' }}
    </span>

    <MDC
      v-if="message.content"
      class="chat-message__content"
      :value="message.content"
    />
    <p v-else class="chat-message__thinking">
      正在思考…
    </p>

    <div
      v-if="message.role === 'assistant' && message.content"
      class="chat-message__actions"
    >
      <button
        type="button"
        aria-label="复制回答"
        @click="copyMessage"
      >
        {{ copied ? '已复制' : '复制' }}
      </button>
      <span
        v-if="copyError"
        class="chat-message__copy-status"
        role="status"
      >
        {{ copyError }}
      </span>
    </div>

    <span
      v-if="message.status === 'stopped'"
      class="chat-message__state chat-message__state--stopped"
    >
      已停止生成
    </span>
    <span
      v-else-if="message.status === 'error'"
      class="chat-message__state chat-message__state--error"
    >
      回答生成失败
    </span>

    <details
      v-if="message.citations?.length"
      class="chat-message__citations citations"
    >
      <summary>查看 {{ message.citations.length }} 条引用来源</summary>
      <article
        v-for="citation in message.citations"
        :key="citation.id"
        class="citation"
      >
        <strong class="citation__title">{{ citation.title }}</strong>
        <p class="citation__excerpt">
          {{ citation.excerpt }}
        </p>
      </article>
    </details>
  </article>
</template>
