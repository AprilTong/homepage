<script setup lang="ts">
import type { ChatClient } from '../../types/chat'

const props = defineProps<{
  client?: ChatClient
}>()

const {
  messages,
  status,
  errorMessage,
  isStreaming,
  sendMessage,
  stopGenerating,
  retryLastMessage,
} = useKnowledgeChat(props.client)

onBeforeUnmount(stopGenerating)
</script>

<template>
  <section
    class="knowledge-chat"
    aria-label="April AI 知识库对话"
  >
    <header class="knowledge-chat__header">
      <div class="knowledge-chat__identity">
        <span
          class="knowledge-chat__terminal"
          aria-hidden="true"
        >&gt;_</span>
        <strong class="knowledge-chat__brand">April AI / 知识库对话</strong>
      </div>
    </header>

    <div class="knowledge-chat__body">
      <ChatWelcome
        v-if="messages.length === 0"
        @select="sendMessage"
      />
      <ChatMessageList
        v-else
        :messages="messages"
      />
    </div>

    <ChatStatusNotice
      v-if="status === 'error'"
      :message="errorMessage"
      @retry="retryLastMessage"
    />

    <ChatComposer
      :streaming="isStreaming"
      @send="sendMessage"
      @stop="stopGenerating"
    />

    <footer class="knowledge-chat__footer">
      <span class="knowledge-chat__disclaimer">AI 可能会犯错，请核对引用来源</span>
      <span class="knowledge-chat__powered-by">Powered by April's Knowledge Base</span>
    </footer>
  </section>
</template>
