<script setup lang="ts">
type CopyStatus = 'idle' | 'success' | 'error'

const props = defineProps<{
  code?: string
  language?: string
  filename?: string
  highlights?: number[]
  meta?: string
}>()

const status = ref<CopyStatus>('idle')
let resetTimer: ReturnType<typeof setTimeout> | undefined

const label = computed(() => {
  if (status.value === 'success')
    return '已复制'
  if (status.value === 'error')
    return '复制失败'
  return '复制'
})

function scheduleReset() {
  if (resetTimer)
    clearTimeout(resetTimer)
  resetTimer = setTimeout(() => {
    status.value = 'idle'
    resetTimer = undefined
  }, 2000)
}

function copyWithTextarea(value: string) {
  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.dataset.copyFallback = ''
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.append(textarea)
  textarea.select()

  try {
    if (!document.execCommand?.('copy'))
      throw new Error('copy command failed')
  }
  finally {
    textarea.remove()
  }
}

async function copyCode() {
  const value = props.code ?? ''
  try {
    if (navigator.clipboard?.writeText)
      await navigator.clipboard.writeText(value)
    else
      copyWithTextarea(value)
    status.value = 'success'
  }
  catch {
    status.value = 'error'
  }
  scheduleReset()
}

onBeforeUnmount(() => {
  if (resetTimer)
    clearTimeout(resetTimer)
})
</script>

<template>
  <div class="prose-pre">
    <div class="prose-pre__toolbar">
      <span data-testid="code-language">{{ filename || language || '代码' }}</span>
      <button
        type="button"
        :aria-label="`${label}代码`"
        @click="copyCode"
      >
        <span aria-live="polite">{{ label }}</span>
      </button>
    </div>
    <pre><slot /></pre>
  </div>
</template>
