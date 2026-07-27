import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const configPath = resolve(process.cwd(), 'nuxt.config.ts')
const faviconPath = resolve(process.cwd(), 'public/favicon.svg')

describe('站点图标', () => {
  it('使用与站点品牌一致的自定义同字图标', async () => {
    const [config, favicon] = await Promise.all([
      readFile(configPath, 'utf8'),
      readFile(faviconPath, 'utf8').catch(() => ''),
    ])

    expect(config).toContain("href: '/favicon.svg'")
    expect(config).toContain("href: '/apple-touch-icon.svg'")
    expect(favicon).toContain('<text')
    expect(favicon).toContain('>同</text>')
  })
})
