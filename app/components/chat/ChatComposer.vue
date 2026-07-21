<script setup lang="ts">
const props = defineProps<{
  streaming: boolean
}>()

const emit = defineEmits<{
  send: [question: string]
  stop: []
}>()

const question = ref('')

function submitQuestion() {
  const trimmedQuestion = question.value.trim()

  if (!trimmedQuestion || props.streaming) {
    return
  }

  emit('send', trimmedQuestion)
  question.value = ''
}

function isCoarsePointer() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(pointer: coarse)').matches
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing || isCoarsePointer()) {
    return
  }

  event.preventDefault()
  submitQuestion()
}
</script>

<template>
  <form
    class="chat-composer"
    aria-label="发送问题"
    @submit.prevent="submitQuestion"
  >
    <textarea
      v-model="question"
      :disabled="streaming"
      rows="1"
      placeholder="输入问题，Enter 发送…"
      aria-label="输入问题"
      @keydown="handleKeydown"
    />

    <button
      v-if="streaming"
      type="button"
      aria-label="停止生成"
      @click="emit('stop')"
    >
      ■
    </button>
    <button
      v-else
      type="submit"
      aria-label="发送问题"
      :disabled="!question.trim()"
    >
      发送 ↑
    </button>
  </form>
</template>
