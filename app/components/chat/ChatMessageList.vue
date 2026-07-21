<script setup lang="ts">
import type { ChatMessage } from '../../types/chat'

const props = defineProps<{
  messages: ChatMessage[]
}>()

const list = useTemplateRef<HTMLElement>('list')
const content = useTemplateRef<HTMLElement>('content')
let resizeObserver: ResizeObserver | undefined

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function scrollToBottom() {
  const element = list.value
  if (!element || typeof element.scrollTo !== 'function') {
    return
  }

  element.scrollTo({
    top: element.scrollHeight,
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
  })
}

watch(
  () => props.messages.map(message => [
    message.id,
    message.content,
    message.status,
    message.citations?.map(citation => [
      citation.id,
      citation.title,
      citation.excerpt,
    ]),
  ]),
  async () => {
    await nextTick()
    scrollToBottom()
  },
)

onMounted(() => {
  if (typeof ResizeObserver === 'undefined' || !list.value) {
    return
  }

  resizeObserver = new ResizeObserver(scrollToBottom)
  resizeObserver.observe(list.value)

  if (content.value) {
    resizeObserver.observe(content.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})
</script>

<template>
  <section
    ref="list"
    class="message-list"
    aria-live="polite"
    aria-label="对话消息"
  >
    <div
      ref="content"
      class="message-list__content"
    >
      <ChatMessage
        v-for="message in messages"
        :key="message.id"
        :message="message"
      />
    </div>
  </section>
</template>
