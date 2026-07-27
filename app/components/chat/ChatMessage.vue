<script setup lang="ts">
import type { ChatMessage } from '../../types/chat'

const props = defineProps<{
  message: ChatMessage
}>()

const copied = ref(false)
const copyError = ref('')
const copyPending = ref(false)
const copyFeedback = computed(() => copied.value ? '已复制' : copyError.value)
const citationIndex = ref(0)
const citations = computed(() => props.message.citations ?? [])
const activeCitation = computed(() => citations.value[citationIndex.value])
const hasMultipleCitations = computed(() => citations.value.length > 1)
let copyOperation = 0

watch(
  () => [props.message.content, props.message.status] as const,
  () => {
    copyOperation += 1
    copyPending.value = false
    copied.value = false
    copyError.value = ''
  },
)

watch(
  () => props.message.citations,
  () => {
    citationIndex.value = 0
  },
)

function showPreviousCitation() {
  if (citationIndex.value > 0) {
    citationIndex.value -= 1
  }
}

function showNextCitation() {
  if (citationIndex.value < citations.value.length - 1) {
    citationIndex.value += 1
  }
}

async function copyMessage() {
  if (copyPending.value) {
    return
  }

  const operation = ++copyOperation
  const content = props.message.content

  copyPending.value = true
  copied.value = false
  copyError.value = ''

  const clipboard = typeof navigator === 'undefined'
    ? undefined
    : navigator.clipboard

  if (!clipboard || typeof clipboard.writeText !== 'function') {
    copyPending.value = false
    copyError.value = '复制失败，请手动复制'
    return
  }

  try {
    await clipboard.writeText(content)

    if (operation !== copyOperation) {
      return
    }

    copyPending.value = false
    copied.value = true
  }
  catch {
    if (operation !== copyOperation) {
      return
    }

    copyPending.value = false
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

    <p
      v-if="message.content"
      class="chat-message__content chat-message__content--plain"
    >
      {{ message.content }}
    </p>
    <p
      v-else-if="message.role === 'assistant' && message.status === 'streaming'"
      class="chat-message__thinking"
    >
      正在思考…
    </p>

    <div
      v-if="message.role === 'assistant' && message.content && message.status !== 'streaming'"
      class="chat-message__actions"
    >
      <button
        type="button"
        aria-label="复制回答"
        :disabled="copyPending"
        @click="copyMessage"
      >
        {{ copyPending ? '复制中…' : copied ? '已复制' : '复制' }}
      </button>
      <span
        v-if="copyFeedback"
        class="chat-message__copy-status"
        role="status"
        aria-live="polite"
      >
        {{ copyFeedback }}
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
      v-if="citations.length"
      class="chat-message__citations citations"
    >
      <summary>查看 {{ citations.length }} 条引用来源</summary>

      <div class="citation-carousel">
        <div
          v-if="hasMultipleCitations"
          class="citation-carousel__toolbar"
        >
          <button
            type="button"
            class="citation-carousel__nav"
            aria-label="上一条引用"
            :disabled="citationIndex === 0"
            @click="showPreviousCitation"
          >
            ←
          </button>
          <span
            class="citation-carousel__position"
            aria-live="polite"
          >
            {{ citationIndex + 1 }} / {{ citations.length }}
          </span>
          <button
            type="button"
            class="citation-carousel__nav"
            aria-label="下一条引用"
            :disabled="citationIndex === citations.length - 1"
            @click="showNextCitation"
          >
            →
          </button>
        </div>

        <article
          v-if="activeCitation"
          class="citation"
        >
          <strong class="citation__title">{{ activeCitation.title }}</strong>
          <p class="citation__excerpt">
            {{ activeCitation.excerpt }}
          </p>
        </article>
      </div>
    </details>
  </article>
</template>
