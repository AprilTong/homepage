import { defineCollection, defineContentConfig, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    articles: defineCollection({
      type: 'page',
      source: {
        include: 'articles/**/*.md',
        prefix: '/articles',
      },
      schema: z.object({
        title: z.string(),
        description: z.string(),
        date: z.string(),
        category: z.string(),
        categoryLabel: z.string(),
        tags: z.array(z.string()).default([]),
        legacyPaths: z.array(z.string()),
        draft: z.boolean().default(false),
      }),
      indexes: [
        { columns: ['date'] },
        { columns: ['category'] },
      ],
    }),
  },
})
