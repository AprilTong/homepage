<script setup lang="ts">
import type { ChatMessage } from '../../types/chat'

const props = defineProps<{
  messages: ChatMessage[]
}>()

const list = useTemplateRef<HTMLElement>('list')
const content = useTemplateRef<HTMLElement>('content')
const hasStreamingMessage = computed(() => (
  props.messages.some(message => message.status === 'streaming')
))
const announcement = computed(() => {
  const assistant = props.messages.findLast(message => message.role === 'assistant')

  if (!assistant) {
    return ''
  }

  switch (assistant.status) {
    case 'streaming':
      return '正在生成回答'
    case 'complete':
      return '回答生成完成'
    case 'stopped':
      return '已停止生成'
    case 'error':
      return '回答生成失败'
  }
})

const AUTO_FOLLOW_THRESHOLD = 80
let resizeObserver: ResizeObserver | undefined
let mutationObserver: MutationObserver | undefined
let scrollTrackingMode: 'resize' | 'mutation' | 'watch' = 'watch'
let shouldFollowOutput = true

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function isNearBottom() {
  const element = list.value
  if (!element) {
    return true
  }

  return element.scrollHeight - element.scrollTop - element.clientHeight <= AUTO_FOLLOW_THRESHOLD
}

function resumeFollowingNearBottom() {
  if (isNearBottom()) {
    shouldFollowOutput = true
  }
}

function pauseFollowing() {
  shouldFollowOutput = false
}

function handleWheel(event: WheelEvent) {
  if (event.deltaY < 0) {
    pauseFollowing()
  }
}

function handlePointerDown(event: PointerEvent) {
  if (event.target === list.value) {
    pauseFollowing()
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (['ArrowUp', 'PageUp', 'Home'].includes(event.key)) {
    pauseFollowing()
  }
}

function scrollToBottom(force = false) {
  const element = list.value
  if (!force && !shouldFollowOutput) {
    return
  }

  if (!element || typeof element.scrollTo !== 'function') {
    return
  }

  element.scrollTo({
    top: element.scrollHeight,
    behavior: prefersReducedMotion() || hasStreamingMessage.value ? 'auto' : 'smooth',
  })
}

watch(
  () => props.messages.map(message => message.id),
  (messageIds, previousIds) => {
    if (
      messageIds.length > previousIds.length
      && props.messages.slice(previousIds.length).some(message => message.role === 'user')
    ) {
      shouldFollowOutput = true
    }
  },
)

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
    resizeObserver = new ResizeObserver(() => scrollToBottom())
    resizeObserver.observe(listElement)

    if (contentElement) {
      resizeObserver.observe(contentElement)
    }
  }
  else if (typeof MutationObserver !== 'undefined' && contentElement) {
    scrollTrackingMode = 'mutation'
    mutationObserver = new MutationObserver(() => scrollToBottom())
    mutationObserver.observe(contentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    })
  }

  scrollToBottom(true)
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
    aria-label="对话消息"
    :aria-busy="hasStreamingMessage"
    tabindex="0"
    @keydown="handleKeydown"
    @pointerdown="handlePointerDown"
    @scroll.passive="resumeFollowingNearBottom"
    @touchstart.passive="pauseFollowing"
    @wheel.passive="handleWheel"
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
  <p
    class="message-list__announcement sr-only"
    role="status"
    aria-live="polite"
    aria-atomic="true"
  >
    {{ announcement }}
  </p>
</template>
