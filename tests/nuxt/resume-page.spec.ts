import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const resumePagePath = resolve(process.cwd(), 'app/pages/resume.vue')
const headerPath = resolve(process.cwd(), 'app/components/AppHeader.vue')
const stylesheetPath = resolve(process.cwd(), 'app/assets/css/main.css')

describe('简历页', () => {
  it('提供完整履历，但不在顶部导航新增入口', async () => {
    const [resume, header] = await Promise.all([
      readFile(resumePagePath, 'utf8').catch(() => ''),
      readFile(headerPath, 'utf8'),
    ])

    expect(resume).toContain('class="resume-page"')
    expect(resume).toContain('<AppHeader />')
    expect(resume).toContain('同志蓉')
    expect(resume).toContain('前端开发工程师 / AI 应用开发工程师')
    expect(resume).toContain('15091756997')
    expect(resume).toContain('15091756997@163.com')
    expect(resume).toContain('深圳进门财经科技股份有限公司')
    expect(resume).toContain('深圳市禅游科技股份有限公司')
    expect(resume).toContain('上海商帆信息科技有限公司')
    expect(resume).toContain('KnowFlow AI 企业知识库')
    expect(resume).toContain('Cube 低代码开发平台')
    expect(resume).toContain('西安邮电大学')
    expect(resume).toContain('主导 BRM 多环境部署兼容改造，统一配置方案，降低维护成本。')
    expect(resume).not.toContain('主导 BRM 系统多环境部署兼容改造，沉淀统一配置方案，降低环境切换和部署维护成本。')
    expect(resume).toContain("{ title: '前端与工程化', items: ['Vue', 'React'")
    expect(resume).not.toContain("{ title: '前端与工程化', items: ['Vue 3', 'React'")
    expect(resume).toContain("name: '禅机大数据分析平台'")
    expect(resume).not.toContain("name: '棋牌大数据分析平台'")
    expect(resume).toContain("url: 'https://knowflow-ai.bran-nie.cn/login'")
    expect(resume).toContain("url: 'https://gitee.com/youlaiorg/vue3-element-admin'")
    expect(resume).toContain('<a v-if="project.url"')
    expect(header).not.toContain('to="/resume"')
  })

  it('采用独立简历排版并提供打印样式', async () => {
    const stylesheet = await readFile(stylesheetPath, 'utf8').catch(() => '')

    expect(stylesheet).toMatch(/\.resume-page\s*\{/)
    expect(stylesheet).toMatch(/\.resume-hero\s*\{/)
    expect(stylesheet).toMatch(/\.resume-experience > ol\s*\{/)
    expect(stylesheet).toMatch(/\.resume-advantages > ul\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s)
    expect(stylesheet).toMatch(/\.resume-skills > ul > li > ul > li,\s*\.resume-projects__stack span\s*\{/s)
    expect(stylesheet).not.toMatch(/\.resume-skills ul li,\s*\.resume-projects__stack span\s*\{/s)
    expect(stylesheet).toMatch(/\.resume-projects__title:hover\s*\{/)
    expect(stylesheet).toMatch(/@media print\s*\{[\s\S]*?\.resume-page/s)
  })
})
