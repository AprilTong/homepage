<script setup lang="ts">
defineProps<{
  total: number
  skillCount: number
  mcpCount: number
}>()
</script>

<template>
  <header class="ai-tools-hero">
    <div>
      <p class="ai-tools-hero__eyebrow">APRIL / AI TOOLBOX</p>
      <h1 id="ai-tools-title">常用 AI 工具</h1>
      <p class="ai-tools-hero__lead">
        整理我常用和推荐的 Skills 与 MCP，包含安装、配置和使用示例。
      </p>
    </div>
    <p class="ai-tools-hero__counts" data-testid="tool-counts">
      <strong>{{ total }} 个工具</strong>
      <span>{{ skillCount }} Skills</span>
      <span>{{ mcpCount }} MCP</span>
    </p>
  </header>
</template>
