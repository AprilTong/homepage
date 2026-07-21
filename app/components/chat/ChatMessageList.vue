<script setup lang="ts">
import type { ChatMessage } from '../../types/chat'

const props = defineProps<{
  messages: ChatMessage[]
}>()

const list = useTemplateRef<HTMLElement>('list')
const content = useTemplateRef<HTMLElement>('content')
let resizeObserver: ResizeObserver | undefined
let mutationObserver: MutationObserver | undefined
let scrollTrackingMode: 'resize' | 'mutation' | 'watch' = 'watch'

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
    if (scrollTrackingMode !== 'watch') {
      return
    }

    await nextTick()
    scrollToBottom()
  },
)

onMounted(() => {
  const listElement = list.value
  const contentElement = content.value
  if (!listElement) {
    return
  }

  if (typeof ResizeObserver !== 'undefined') {
    scrollTrackingMode = 'resize'
    resizeObserver = new ResizeObserver(scrollToBottom)
    resizeObserver.observe(listElement)

    if (contentElement) {
      resizeObserver.observe(contentElement)
    }
  }
  else if (typeof MutationObserver !== 'undefined' && contentElement) {
    scrollTrackingMode = 'mutation'
    mutationObserver = new MutationObserver(scrollToBottom)
    mutationObserver.observe(contentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    })
  }

  scrollToBottom()
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  mutationObserver?.disconnect()
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
