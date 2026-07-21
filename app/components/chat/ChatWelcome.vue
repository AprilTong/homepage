<script setup lang="ts">
const emit = defineEmits<{
  select: [question: string]
}>()

const prompts = [
  '浏览器指纹是什么？',
  'axios 有哪些实用工具函数？',
  '推荐一条 Vue 学习路径。',
]
</script>

<template>
  <section class="chat-welcome" aria-labelledby="chat-title">
    <div class="ai-orb" aria-hidden="true">✦</div>
    <p class="eyebrow">APRIL AI · KNOWLEDGE ONLINE</p>
    <h1 id="chat-title">今天想了解什么？</h1>
    <p>
      我会从 April 的技术笔记和知识文档中寻找答案，并提供可核对的引用来源。
    </p>

    <div class="quick-prompts" aria-label="快捷问题">
      <button
        v-for="prompt in prompts"
        :key="prompt"
        type="button"
        data-testid="quick-prompt"
        @click="emit('select', prompt)"
      >
        {{ prompt }}
      </button>
    </div>
  </section>
</template>
