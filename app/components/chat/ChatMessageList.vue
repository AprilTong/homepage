<script setup lang="ts">
import type { ChatMessage } from '../../types/chat'

const props = defineProps<{
  messages: ChatMessage[]
}>()

const list = useTemplateRef<HTMLElement>('list')

watch(
  () => props.messages.map(message => message.content),
  async () => {
    await nextTick()

    const element = list.value
    if (!element || typeof element.scrollTo !== 'function') {
      return
    }

    element.scrollTo({
      top: element.scrollHeight,
      behavior: 'smooth',
    })
  },
)
</script>

<template>
  <section
    ref="list"
    class="message-list"
    aria-live="polite"
    aria-label="对话消息"
  >
    <ChatMessage
      v-for="message in messages"
      :key="message.id"
      :message="message"
    />
  </section>
</template>
