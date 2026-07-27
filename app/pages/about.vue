<script setup lang="ts">
const canonicalUrl = 'https://blog.april-tong.cn/about'

const experiences = [
  {
    period: '2025.10 — 2026.05',
    company: '深圳进门财经科技股份有限公司',
    highlights: [
      '主导 BRM 系统多环境部署兼容改造，沉淀统一配置方案。',
      '推进工程化优化与 Vue 版本升级，提升团队研发效率。',
      '完善移动端 AI 功能与体验，保障投研场景的可用性与稳定性。',
    ],
  },
  {
    period: '2019.12 — 2025.05',
    company: '深圳市禅游科技股份有限公司',
    highlights: [
      '主导 Cube 低代码平台架构与研发，业务交付效率提升 60%。',
      '引入微前端架构，支持 5 个核心业务系统独立部署。',
      '建设组件库、脚手架与前端监控体系，推动团队复用与稳定性建设。',
    ],
  },
  {
    period: '2018.10 — 2019.11',
    company: '上海商帆信息科技有限公司',
    highlights: [
      '负责多个小程序与后台系统研发，服务 30+ 品牌客户。',
      '通过分包与加载策略优化，提升小程序首屏体验。',
    ],
  },
] as const

const skills = [
  { name: 'Vue / React', detail: '前端应用与组件体系', level: 92 },
  { name: 'Nuxt', detail: '全栈框架与内容站点开发', level: 87 },
  { name: 'TypeScript', detail: '工程化与类型设计', level: 90 },
  { name: 'AI 应用开发', detail: 'RAG、SSE 与 Agent 工具链', level: 88 },
  {
    name: 'Node.js / NestJS / Prisma / PostgreSQL',
    detail: '服务端、接口与数据建模设计',
    level: 82,
  },
  { name: 'Docker / Nginx', detail: '容器化与线上交付', level: 78 },
] as const

const projects = [
  {
    name: 'KnowFlow AI 企业知识库',
    href: 'https://knowflow-ai.bran-nie.cn/login',
    description: '企业知识检索与任务协作平台，提供 RAG 问答、流式对话和 Agent 工具调用。',
    stack: ['React', 'NestJS', 'Prisma', 'pgvector'],
  },
  {
    name: 'Cube 低代码开发平台',
    href: undefined,
    description: '支持业务流程快速搭建与定制页面配置，已服务 CRM、审批流、任务管理等 50+ 应用。',
    stack: ['Vue 3', 'Vite', 'Wujie', 'WebSocket'],
  },
  {
    name: 'BI 数据分析系统',
    href: undefined,
    description: '面向多数据源接入、即时分析查询与拖拽式报表搭建的数据可视化平台。',
    stack: ['Vue 3', 'ECharts', 'Pinia', 'Vite'],
  },
] as const

useSeoMeta({
  title: '关于｜April 的记录小屋',
  description: 'April 的前端与 AI 应用开发经历、技术栈与代表项目。',
  ogTitle: '关于｜April 的记录小屋',
  ogDescription: '前端开发工程师与 AI 应用开发者，记录技术实践与持续学习。',
  ogType: 'profile',
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
})
</script>

<template>
  <div class="about-page">
    <AppHeader />

    <main aria-label="April 个人档案">
      <header class="about-hero">
        <div>
          <p class="about-hero__eyebrow">APRIL / PERSONAL ARCHIVE</p>
          <p class="about-hero__lead">
            8 年前端与 AI 应用开发经验，专注把复杂的业务需求、技术方案与可持续的交付流程连接起来。
          </p>
        </div>

        <div class="about-hero__aside">
          <p>全栈开发 · 前端工程化 · AI 应用 · 企业级系统</p>
          <a href="https://github.com/AprilTong" target="_blank" rel="noreferrer">
            GitHub / AprilTong ↗
          </a>
        </div>
      </header>

      <div class="about-layout">
        <section class="about-experience" aria-labelledby="experience-title">
          <div class="about-section-heading">
            <p>01 / EXPERIENCE</p>
            <h2 id="experience-title">经历</h2>
          </div>

          <ol class="about-timeline">
            <li v-for="experience in experiences" :key="experience.company">
              <div class="about-timeline__heading">
                <p class="about-timeline__period">{{ experience.period }}</p>
                <p class="about-timeline__company">{{ experience.company }}</p>
              </div>
              <ul>
                <li v-for="highlight in experience.highlights" :key="highlight">
                  {{ highlight }}
                </li>
              </ul>
            </li>
          </ol>
        </section>

        <aside class="about-sidebar">
          <section class="about-skills" aria-labelledby="skills-title">
            <div class="about-section-heading">
              <p>02 / TOOLKIT</p>
              <h2 id="skills-title">技术栈</h2>
            </div>

            <ul class="about-skill-list">
              <li v-for="skill in skills" :key="skill.name">
                <div class="about-skill-list__label">
                  <strong>{{ skill.name }}</strong>
                  <span>{{ skill.detail }}</span>
                </div>
                <span
                  class="about-skill-list__bar"
                  role="progressbar"
                  :aria-label="`${skill.name} 熟练度`"
                  :aria-valuenow="skill.level"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  :style="{ '--skill-level': `${skill.level}%` }"
                />
              </li>
            </ul>
          </section>
        </aside>
      </div>

      <section class="about-projects" aria-labelledby="projects-title">
        <div class="about-section-heading">
          <p>04 / SELECTED WORK</p>
          <h2 id="projects-title">代表项目</h2>
        </div>

        <ul>
          <li v-for="project in projects" :key="project.name">
            <h3>
              <a v-if="project.href" :href="project.href" target="_blank" rel="noreferrer">
                {{ project.name }}
              </a>
              <template v-else>{{ project.name }}</template>
            </h3>
            <p>{{ project.description }}</p>
            <ul aria-label="技术栈">
              <li v-for="technology in project.stack" :key="technology">
                {{ technology }}
              </li>
            </ul>
          </li>
        </ul>
      </section>
    </main>
  </div>
</template>
