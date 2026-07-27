export default defineNuxtConfig({
  compatibilityDate: '2026-07-21',
  modules: ['@nuxt/content'],
  css: ['~/assets/css/main.css'],
  content: {
    experimental: {
      sqliteConnector: 'native',
    },
  },
  devtools: { enabled: true },
  typescript: {
    typeCheck: 'build',
  },
  runtimeConfig: {
    public: {
      knowflowPublicChatUrl: process.env.NUXT_PUBLIC_KNOWFLOW_PUBLIC_CHAT_URL
        ?? 'https://knowflow-ai-api.bran-nie.cn/api/v1/public/chat/stream',
    },
  },
  routeRules: {
    '/chat': {
      redirect: {
        to: '/',
        statusCode: 301,
      },
    },
    '/accumulate/': {
      redirect: {
        to: '/articles',
        statusCode: 301,
      },
    },
    '/categories/': {
      redirect: {
        to: '/articles',
        statusCode: 301,
      },
    },
    '/tag/': {
      redirect: {
        to: '/articles',
        statusCode: 301,
      },
    },
    '/timeline/': {
      redirect: {
        to: '/articles',
        statusCode: 301,
      },
    },
  },
  app: {
    head: {
      htmlAttrs: {
        lang: 'zh-CN',
      },
      meta: [
        { name: 'theme-color', content: '#070b12' },
        { name: 'color-scheme', content: 'dark' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.svg' },
      ],
    },
  },
})
