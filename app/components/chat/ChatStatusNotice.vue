<script setup lang="ts">
defineProps<{
  message: string
}>()

const emit = defineEmits<{
  retry: []
}>()
</script>

<template>
  <div
    class="status-notice"
    role="alert"
  >
    <span class="status-notice__message">{{ message }}</span>
    <button
      class="status-notice__retry"
      type="button"
      @click="emit('retry')"
    >
      重新发送
    </button>
  </div>
</template>
