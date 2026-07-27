<script setup lang="ts">
import KnowledgeChatShell from '~/components/chat/KnowledgeChatShell.vue'

const canonicalUrl = 'https://blog.april-tong.cn/'
const websiteStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'April AI',
  url: canonicalUrl,
  author: {
    '@type': 'Person',
    name: 'AprilTong',
  },
} as const

useSeoMeta({
  title: 'April AI｜从我的技术笔记中寻找答案',
  description: '与 April 的个人知识库对话，检索前端技术笔记、源码学习与实践记录。',
  ogTitle: 'April AI｜个人知识库',
  ogDescription: '从技术笔记和知识文档中寻找答案。',
  ogType: 'website',
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [{
    key: 'website-json-ld',
    id: 'website-json-ld',
    type: 'application/ld+json',
    textContent: JSON.stringify(websiteStructuredData),
  }],
})
</script>

<template>
  <div class="home-shell">
    <AppHeader />
    <main aria-label="AI 知识库首页">
      <KnowledgeChatShell />
    </main>
  </div>
</template>
