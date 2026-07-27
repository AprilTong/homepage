import { defineVitestProject } from '@nuxt/test-utils/config'
import { fileURLToPath } from 'node:url'
import { defineConfig, defineProject } from 'vitest/config'

const sharedDirectory = fileURLToPath(new URL('./shared', import.meta.url))
const serverDirectory = fileURLToPath(new URL('./server', import.meta.url))

export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: [
      defineProject({
        resolve: {
          alias: {
            '#shared': sharedDirectory,
            '#server': serverDirectory,
          },
        },
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.spec.ts'],
          environment: 'node',
        },
      }),
      await defineVitestProject({
        resolve: {
          alias: {
            '#shared': sharedDirectory,
            '#server': serverDirectory,
          },
        },
        test: {
          name: 'nuxt',
          include: ['tests/nuxt/**/*.spec.ts'],
          environment: 'nuxt',
          environmentOptions: {
            nuxt: {
              domEnvironment: 'happy-dom',
            },
          },
        },
      }),
    ],
  },
})
