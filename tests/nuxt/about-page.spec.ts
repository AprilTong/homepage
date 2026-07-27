import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const aboutPagePath = resolve(process.cwd(), 'app/pages/about.vue')
const stylesheetPath = resolve(process.cwd(), 'app/assets/css/main.css')

describe('关于页', () => {
  it('展示个人简介、职业经历、技术栈与代表项目', async () => {
    const source = await readFile(aboutPagePath, 'utf8').catch(() => '')

    expect(source).toContain('class="about-page"')
    expect(source).toContain('<main aria-label="April 个人档案">')
    expect(source).not.toContain('<h1 id="about-title">关于</h1>')
    expect(source).not.toContain('class="about-education"')
    expect(source).not.toContain('03 / EDUCATION')
    expect(source).toContain('8 年前端与 AI 应用开发经验')
    expect(source).toContain('深圳进门财经科技股份有限公司')
    expect(source).toContain('深圳市禅游科技股份有限公司')
    expect(source).toContain('上海商帆信息科技有限公司')
    expect(source).toContain('KnowFlow AI 企业知识库')
    expect(source).toContain('https://knowflow-ai.bran-nie.cn/login')
    expect(source).toContain('Cube 低代码开发平台')
    expect(source).toContain('BI 数据分析系统')
    expect(source).toContain('Nuxt')
    expect(source).toContain("name: 'Node.js / NestJS / Prisma / PostgreSQL'")
    expect(source).not.toContain('Vite / CI/CD')
    expect(source).toContain('全栈开发')
    expect(source).toContain('https://github.com/AprilTong')
  })

  it('沿用深空玻璃视觉，并在窄屏改为单列', async () => {
    const [source, stylesheet] = await Promise.all([
      readFile(aboutPagePath, 'utf8'),
      readFile(stylesheetPath, 'utf8'),
    ])

    expect(stylesheet).toMatch(/\.about-page\s*\{[^}]*1220px/s)
    expect(stylesheet).not.toMatch(/\.about-hero\s*\{[^}]*min-height:\s*280px/s)
    expect(stylesheet).toMatch(/\.about-layout\s*\{[^}]*align-items:\s*start/s)
    expect(stylesheet).toMatch(/\.about-timeline\s*\{[^}]*gap:\s*48px/s)
    expect(stylesheet).toMatch(/\.about-skill-list\s*\{[^}]*gap:\s*20px/s)
    expect(source).toContain('class="about-timeline__heading"')
    expect(source).toMatch(/class="about-timeline__heading"[\s\S]*?about-timeline__period/)
    expect(source).not.toContain('{{ experience.role }}')
    expect(stylesheet).toMatch(/\.about-timeline__heading\s*\{[^}]*display:\s*flex/s)
    expect(stylesheet).toMatch(/\.about-timeline__heading\s*\{[^}]*align-items:\s*baseline/s)
    expect(stylesheet).not.toMatch(/\.about-timeline > li\s*\{[^}]*grid-template-columns:/s)
    expect(stylesheet).toMatch(/\.about-projects > ul > li\s*\{[^}]*min-height:\s*184px/s)
    expect(stylesheet).toMatch(/\.about-experience,[\s\S]*?\.about-skills\s*\{[^}]*box-shadow/s)
    expect(stylesheet).not.toMatch(/\.about-skills\s*\{[^}]*position:\s*sticky/s)
    expect(stylesheet).toMatch(/@media \(max-width: 960px\)[\s\S]*?\.about-layout\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/)
  })
})
