<script setup lang="ts">
const canonicalUrl = 'https://blog.april-tong.cn/resume'

const advantages = [
  '熟悉 Vue、React 技术栈及前端工程体系，主导过企业级低代码平台与数据可视化系统建设。',
  '具备多端开发经验，覆盖 Web、H5、小程序、Electron 与 Chrome 插件。',
  '关注工程化与研发效率，具备 Vite 构建优化、CI/CD、Docker 容器化及 Node.js 服务端经验。',
  '熟练应用 AI 工具提升研发效率，具备 AI 应用开发、RAG、SSE 与 Agent 工具链实践。',
  '具备从 0 到 1 的全栈交付能力，可独立完成系统设计、开发落地、部署上线与持续迭代。',
] as const

const experiences = [
  {
    company: '深圳进门财经科技股份有限公司',
    period: '2025.10 — 2026.05',
    role: '前端开发工程师',
    highlights: [
      '主导 BRM 多环境部署兼容改造，统一配置方案，降低维护成本。',
      '推进工程化优化与 Vue 版本升级，提升团队研发效率。',
      '负责移动端 AI 功能完善与体验优化，保障投研场景的可用性与稳定性。',
    ],
  },
  {
    company: '深圳市禅游科技股份有限公司',
    period: '2019.12 — 2025.05',
    role: '前端开发工程师',
    highlights: [
      '主导公司核心系统 Cube 低代码平台架构与研发，业务交付效率提升 60%。',
      '引入微前端架构（Wujie），实现模块独立部署，已支持 5 个核心业务系统落地。',
      '建设组件库与脚手架，推动团队复用与稳定性建设，研发效率提升 40%。',
      '主导异步接入 Sentry 前端监控体系，线上异常减少 60%。',
    ],
  },
  {
    company: '上海商帆信息科技有限公司',
    period: '2018.10 — 2019.11',
    role: '前端开发工程师',
    highlights: [
      '负责多个小程序与后台系统研发，覆盖 30+ 品牌客户。',
      '优化小程序启动性能，引入分包机制与加载策略，速度提升 35%+。',
    ],
  },
] as const

const skillGroups = [
  { title: '前端与工程化', items: ['Vue', 'React', 'TypeScript', 'Vite', 'Vue Router', 'Element Plus'] },
  { title: '全栈与数据', items: ['Nuxt', 'Node.js', 'NestJS', 'Prisma', 'PostgreSQL', 'pgvector'] },
  { title: 'AI 与协作', items: ['RAG', 'SSE', 'Agent', 'LangChain', 'Docker', 'Nginx'] },
  { title: '多端与架构', items: ['Wujie', 'WebSocket', '小程序', 'Electron', 'Chrome 插件', 'CI/CD'] },
] as const

const projects = [
  {
    name: 'KnowFlow AI 企业知识库',
    url: 'https://knowflow-ai.bran-nie.cn/login',
    summary: '面向企业知识检索与任务协作的一体化 AI 应用，支持知识库管理、RAG 问答、流式对话与 Agent 工具调用。',
    stack: ['React', 'TypeScript', 'Vite', 'MobX', 'Tailwind CSS', 'NestJS', 'Prisma', 'PostgreSQL', 'pgvector', 'Docker', 'Nginx'],
    highlights: [
      '实现 SSE 流式对话、文档向量入库、混合检索与引用溯源，支持 Agent 工具权限校验与超时重试。',
      '接入 Milvus、阿里 Embedding 与 pgvector，构建检索、Rerank 与 Prompt 增强链路。',
      '设计异步文档入库流程，拆分解析、切片、向量化与入库阶段，支持进度追踪、重试与异常恢复。',
    ],
  },
  {
    name: 'Cube 低代码开发平台',
    url: undefined,
    summary: '企业内部低代码平台，支持业务流程快速搭建、定制页面配置，覆盖 CRM、审批流、任务管理等业务场景。',
    stack: ['Vite', 'Vue 3', 'TypeScript', 'Element Plus', 'Vue Router', 'Wujie', 'WebSocket'],
    highlights: [
      '抽象企业级权限模型，覆盖多组织、角色、菜单与数据权限，并支持业务系统自定义开发视图。',
      '负责 80+ 组件开发与页面拖拽编辑器实现，引入微前端架构保障子系统独立部署与风格一致。',
      '支持自定义数据权限、字典与数据规则，提升平台安全性；建设组件库、流程引擎与前端监控体系。',
    ],
  },
  {
    name: 'BI 数据分析系统',
    url: undefined,
    summary: '面向企业的大数据分析与可视化平台，支持多数据源接入、即时分析查询与拖拽式报表搭建。',
    stack: ['Vue 3', 'Vite', 'Pinia', 'ECharts', 'Element Plus', 'vue-grid-layout', 'hot-formula-parser'],
    highlights: [
      '完成图表联动与交互式钻取，支持大数据量与动态透视表结构下的用户自定义列宽。',
      '设计图表配置标准，提升图表数据率与复用性；平台已在 5 个系统上线使用。',
    ],
  },
  {
    name: '禅机大数据分析平台',
    url: undefined,
    summary: '面向游戏行业的数据分析平台，让游戏工作室快速了解不同场景下的用户关键行为。',
    stack: ['Vue 2', 'Vuex', 'ECharts', 'Webpack'],
    highlights: [
      '支持留存分析等七大分析模型，洞察玩家行为并辅助运营决策。',
      '构建可配置分析报表，支持七大维度灵活组合；搭建工程化构建体系并引入 ESLint、Prettier 与 CI 部署。',
    ],
  },
  {
    name: '会员中心小程序',
    url: undefined,
    summary: '适用于品牌零售的小程序，帮助品牌触达消费者并通过营销活动、积分商城提升会员黏性。',
    stack: ['Vue', 'Mpvue', 'WebSocket', 'Canvas'],
    highlights: [
      '参与大转盘抽奖、砸金蛋等会员互动活动开发，提高会员活跃度。',
      '覆盖 30+ 品牌客户，持续优化小程序性能与加载策略。',
    ],
  },
  {
    name: '开源项目：vue3-element-admin',
    url: 'https://gitee.com/youlaiorg/vue3-element-admin',
    summary: '基于 Vue 3、Vite、TypeScript、Element Plus 与 Pinia 的开源后台管理前端模板。',
    stack: ['Vue 3', 'Vite', 'TypeScript', 'Element Plus', 'Pinia'],
    highlights: ['项目已收获 5k+ star。'],
  },
] as const

useSeoMeta({
  title: '简历｜同志蓉',
  description: '同志蓉的前端与 AI 应用开发简历，涵盖工作经历、项目经验与技术栈。',
  ogTitle: '简历｜同志蓉',
  ogDescription: '前端开发工程师 / AI 应用开发工程师。',
  ogType: 'profile',
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
})
</script>

<template>
  <div class="resume-page">
    <AppHeader />

    <main aria-label="同志蓉个人简历">
      <header class="resume-hero">
        <div>
          <p class="resume-hero__eyebrow">TONG ZHIRONG / RESUME</p>
          <h1>同志蓉</h1>
          <p class="resume-hero__role">前端开发工程师 / AI 应用开发工程师</p>
        </div>

        <ul class="resume-contact" aria-label="联系信息">
          <li><span>手机</span><a href="tel:15091756997">15091756997</a></li>
          <li><span>邮箱</span><a href="mailto:15091756997@163.com">15091756997@163.com</a></li>
          <li><span>GitHub</span><a href="https://github.com/AprilTong" target="_blank" rel="noreferrer">github.com/AprilTong ↗</a></li>
          <li><span>博客</span><a href="https://blog.april-tong.cn/" target="_blank" rel="noreferrer">blog.april-tong.cn ↗</a></li>
        </ul>
      </header>

      <section class="resume-section resume-advantages" aria-labelledby="advantages-title">
        <div class="resume-section__heading">
          <p>01 / PROFILE</p>
          <h2 id="advantages-title">个人优势</h2>
        </div>
        <ul>
          <li v-for="advantage in advantages" :key="advantage">{{ advantage }}</li>
        </ul>
      </section>

      <div class="resume-layout">
        <section class="resume-section resume-experience" aria-labelledby="experience-title">
          <div class="resume-section__heading">
            <p>02 / EXPERIENCE</p>
            <h2 id="experience-title">工作经历</h2>
          </div>

          <ol>
            <li v-for="experience in experiences" :key="experience.company">
              <header>
                <h3>{{ experience.company }}</h3>
                <p>{{ experience.period }}</p>
                <strong>{{ experience.role }}</strong>
              </header>
              <ul>
                <li v-for="highlight in experience.highlights" :key="highlight">{{ highlight }}</li>
              </ul>
            </li>
          </ol>
        </section>

        <aside class="resume-section resume-skills" aria-labelledby="skills-title">
          <div class="resume-section__heading">
            <p>03 / TOOLKIT</p>
            <h2 id="skills-title">技术栈</h2>
          </div>

          <ul>
            <li v-for="group in skillGroups" :key="group.title">
              <h3>{{ group.title }}</h3>
              <ul>
                <li v-for="skill in group.items" :key="skill">{{ skill }}</li>
              </ul>
            </li>
          </ul>
        </aside>
      </div>

      <section class="resume-section resume-projects" aria-labelledby="projects-title">
        <div class="resume-section__heading">
          <p>04 / SELECTED WORK</p>
          <h2 id="projects-title">项目经历</h2>
        </div>

        <ol>
          <li v-for="project in projects" :key="project.name">
            <h3>
              <a v-if="project.url" class="resume-projects__title" :href="project.url" target="_blank" rel="noreferrer">
                {{ project.name }}
              </a>
              <template v-else>{{ project.name }}</template>
            </h3>
            <p>{{ project.summary }}</p>
            <div class="resume-projects__stack" aria-label="技术栈">
              <span v-for="technology in project.stack" :key="technology">{{ technology }}</span>
            </div>
            <ul>
              <li v-for="highlight in project.highlights" :key="highlight">{{ highlight }}</li>
            </ul>
          </li>
        </ol>
      </section>

      <section class="resume-section resume-education" aria-labelledby="education-title">
        <div class="resume-section__heading">
          <p>05 / EDUCATION</p>
          <h2 id="education-title">教育与其他</h2>
        </div>
        <ul>
          <li><strong>西安邮电大学</strong><span>2014.09 — 2018.07 · 电子科学与技术</span></li>
          <li><strong>荣誉奖励</strong><span>连续三年绩效评级 A，获“最佳新人奖”协作之星，国家励志奖学金。</span></li>
          <li><strong>证书</strong><span>PMP 项目管理、CET-4。</span></li>
        </ul>
      </section>
    </main>
  </div>
</template>
