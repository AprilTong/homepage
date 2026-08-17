import { defineCollection, defineContentConfig, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    aiTools: defineCollection({
      type: 'page',
      source: {
        include: 'ai-tools/**/*.md',
        prefix: '/ai-tools',
      },
      schema: z.object({
        title: z.string(),
        description: z.string(),
        type: z.enum(['skill', 'mcp']),
        order: z.number().int().positive(),
        platforms: z.array(z.string()).default([]),
        tags: z.array(z.string()).default([]),
        officialUrl: z.string().url(),
        repositoryUrl: z.string().url().optional(),
        featured: z.boolean().default(false),
        draft: z.boolean().default(false),
      }),
      indexes: [
        { columns: ['type'] },
        { columns: ['order'] },
      ],
    }),
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
