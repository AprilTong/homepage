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
    typeCheck: true,
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
    },
  },
})
