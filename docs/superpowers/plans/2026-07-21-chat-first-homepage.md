# Chat-first 博客首页实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 使用 Nuxt 4 与 Nuxt Content v3 构建「深空知识站」风格的 Chat-only 博客首页，并交付可测试、可替换真实 API 的演示聊天体验。

**架构：** 首页由薄页面层、独立展示组件和 `useKnowledgeChat` 状态组合式函数组成。展示组件不直接请求网络；聊天行为通过 `ChatClient` 接口注入，本阶段默认使用本地演示流，后续可无缝替换为 Nuxt Server API 与 KnowFlow AI SSE。

**技术栈：** Node.js 22+、pnpm、Nuxt 4、Vue 3、Nuxt Content v3、TypeScript、Vitest、`@nuxt/test-utils`、Vue Test Utils、Happy DOM。

---

## 文件结构

### 工程配置

- `package.json`：脚本、运行时依赖和测试依赖。
- `.nvmrc`：固定 Node.js 主版本为 22。
- `nuxt.config.ts`：Nuxt Content、全局样式、SEO 默认值和开发配置。
- `content.config.ts`：定义后续文章迁移使用的 `articles` 集合。
- `vitest.config.ts`：区分 Node 单元测试和 Nuxt 组件测试。
- `app/app.vue`：应用根节点，只负责渲染页面。
- `app/assets/css/main.css`：设计令牌、深空背景、基础排版、焦点与减少动态效果规则。

### 聊天领域

- `app/types/chat.ts`：消息、引用、流事件、客户端和页面状态类型。
- `app/services/demo-chat-client.ts`：本阶段的可中止演示流实现。
- `app/composables/useKnowledgeChat.ts`：发送、流式追加、停止、失败和重试状态机。

### 页面与组件

- `app/pages/index.vue`：首页 SEO 与 Chat 首页装配。
- `app/components/AppHeader.vue`：桌面胶囊导航和移动端菜单。
- `app/components/chat/ChatWelcome.vue`：欢迎文案、AI 光球和快捷问题。
- `app/components/chat/ChatComposer.vue`：输入、发送、换行和停止生成。
- `app/components/chat/ChatMessage.vue`：单条消息、Markdown 渲染、状态和复制入口。
- `app/components/chat/ChatMessageList.vue`：消息列表与自动滚动。
- `app/components/chat/ChatStatusNotice.vue`：错误、限流和重试提示。
- `app/components/chat/KnowledgeChatShell.vue`：欢迎态、对话态和输入区布局。

### 测试

- `tests/unit/useKnowledgeChat.spec.ts`：聊天状态机单元测试。
- `tests/nuxt/AppHeader.spec.ts`：导航与移动菜单组件测试。
- `tests/nuxt/ChatWelcome.spec.ts`：欢迎态和快捷问题测试。
- `tests/nuxt/ChatComposer.spec.ts`：输入、快捷键和停止生成测试。
- `tests/nuxt/ChatMessageList.spec.ts`：消息、状态和引用渲染测试。
- `tests/nuxt/KnowledgeChatShell.spec.ts`：首页聊天壳集成测试。
- `tests/nuxt/index-page.spec.ts`：根页面结构与可访问名称测试。

## 参考资料

- Nuxt 4 安装要求与命令：`https://nuxt.com/docs/4.x/getting-started/installation/`
- Nuxt Content v3：`https://content.nuxt.com/docs/getting-started`
- Nuxt 官方测试工具：`https://nuxt.com/docs/3.x/getting-started/testing`

### 任务 1：建立 Nuxt 4 工程与测试基线

**文件：**

- 创建：`package.json`
- 创建：`.nvmrc`
- 创建：`nuxt.config.ts`
- 创建：`content.config.ts`
- 创建：`vitest.config.ts`
- 创建：`app/app.vue`
- 创建：`app/assets/css/main.css`
- 修改：`.gitignore`

- [ ] **步骤 1：创建最小工程清单**

创建 `package.json`：

```json
{
  "name": "april-blog",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=22.0.0"
  },
  "scripts": {
    "dev": "nuxt dev",
    "build": "nuxt build",
    "generate": "nuxt generate",
    "preview": "nuxt preview",
    "typecheck": "nuxt typecheck",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

创建 `.nvmrc`：

```text
22
```

- [ ] **步骤 2：安装运行时与测试依赖**

运行：

```bash
pnpm add nuxt@^4 @nuxt/content@^3 vue vue-router
pnpm add -D @nuxt/test-utils vitest @vue/test-utils happy-dom typescript vue-tsc
```

预期：生成 `pnpm-lock.yaml`，安装过程无 peer dependency 错误。

- [ ] **步骤 3：创建 Nuxt 与 Content 配置**

创建 `nuxt.config.ts`：

```ts
export default defineNuxtConfig({
  compatibilityDate: '2026-07-21',
  modules: ['@nuxt/content'],
  css: ['~/assets/css/main.css'],
  devtools: { enabled: true },
  typescript: { typeCheck: true },
  app: {
    head: {
      htmlAttrs: { lang: 'zh-CN' },
      meta: [
        { name: 'theme-color', content: '#070b12' },
        { name: 'color-scheme', content: 'dark' },
      ],
    },
  },
})
```

创建 `content.config.ts`：

```ts
import { defineCollection, defineContentConfig, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    articles: defineCollection({
      type: 'page',
      source: 'articles/**/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string().optional(),
        date: z.string(),
        tags: z.array(z.string()).default([]),
        draft: z.boolean().default(false),
      }),
    }),
  },
})
```

创建 `vitest.config.ts`：

```ts
import { defineVitestProject } from '@nuxt/test-utils/config'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.spec.ts'],
          environment: 'node',
        },
      },
      await defineVitestProject({
        test: {
          name: 'nuxt',
          include: ['tests/nuxt/**/*.spec.ts'],
          environment: 'nuxt',
          environmentOptions: {
            nuxt: { domEnvironment: 'happy-dom' },
          },
        },
      }),
    ],
  },
})
```

- [ ] **步骤 4：创建应用根节点与基础样式入口**

创建 `app/app.vue`：

```vue
<template>
  <NuxtPage />
</template>
```

创建 `app/assets/css/main.css`：

```css
:root {
  color-scheme: dark;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #070b12;
  color: #eef4ff;
}

* {
  box-sizing: border-box;
}

html,
body,
#__nuxt {
  min-height: 100%;
  margin: 0;
}

button,
textarea {
  font: inherit;
}

:focus-visible {
  outline: 2px solid #6bddff;
  outline-offset: 3px;
}
```

在 `.gitignore` 末尾加入：

```gitignore
.data/
coverage/
```

- [ ] **步骤 5：验证最小工程**

运行：

```bash
pnpm typecheck
pnpm test -- --passWithNoTests
```

预期：类型检查成功；Vitest 报告没有测试文件，并以退出码 0 结束。

- [ ] **步骤 6：提交工程基线**

```bash
git add package.json pnpm-lock.yaml .nvmrc nuxt.config.ts content.config.ts vitest.config.ts app/app.vue app/assets/css/main.css .gitignore
git commit -m "chore(工程): 初始化 Nuxt 4 与测试环境"
```

### 任务 2：用 TDD 实现聊天领域状态机

**文件：**

- 创建：`tests/unit/useKnowledgeChat.spec.ts`
- 创建：`app/types/chat.ts`
- 创建：`app/services/demo-chat-client.ts`
- 创建：`app/composables/useKnowledgeChat.ts`

- [ ] **步骤 1：编写失败的聊天状态机测试**

创建 `tests/unit/useKnowledgeChat.spec.ts`：

```ts
import { describe, expect, it, vi } from 'vitest'
import type { ChatClient } from '../../app/types/chat'
import { useKnowledgeChat } from '../../app/composables/useKnowledgeChat'

function createClient(chunks = ['你好，', '这是知识库回答。']): ChatClient {
  return {
    async *streamAnswer(_question, signal) {
      for (const delta of chunks) {
        if (signal.aborted) return
        yield { type: 'delta', delta }
      }
      yield { type: 'done' }
    },
  }
}

describe('useKnowledgeChat', () => {
  it('按流事件追加用户问题与助手回答', async () => {
    const chat = useKnowledgeChat(createClient())

    await chat.sendMessage('浏览器指纹是什么？')

    expect(chat.messages.value).toHaveLength(2)
    expect(chat.messages.value[0]).toMatchObject({ role: 'user', content: '浏览器指纹是什么？' })
    expect(chat.messages.value[1]).toMatchObject({
      role: 'assistant',
      content: '你好，这是知识库回答。',
      status: 'complete',
    })
    expect(chat.status.value).toBe('idle')
  })

  it('忽略空白问题和生成中的重复发送', async () => {
    let release!: () => void
    const blocked = new Promise<void>(resolve => { release = resolve })
    const client: ChatClient = {
      async *streamAnswer() {
        yield { type: 'delta', delta: '开始' }
        await blocked
        yield { type: 'done' }
      },
    }
    const chat = useKnowledgeChat(client)

    await chat.sendMessage('   ')
    const first = chat.sendMessage('第一个问题')
    await Promise.resolve()
    await chat.sendMessage('第二个问题')

    expect(chat.messages.value.filter(message => message.role === 'user')).toHaveLength(1)
    release()
    await first
  })

  it('停止生成后保留已有内容', async () => {
    const client: ChatClient = {
      async *streamAnswer(_question, signal) {
        yield { type: 'delta', delta: '已经生成' }
        await new Promise<void>(resolve => signal.addEventListener('abort', () => resolve(), { once: true }))
      },
    }
    const chat = useKnowledgeChat(client)
    const pending = chat.sendMessage('停止测试')
    await vi.waitFor(() => expect(chat.status.value).toBe('streaming'))

    chat.stopGenerating()
    await pending

    expect(chat.messages.value[1]).toMatchObject({ content: '已经生成', status: 'stopped' })
    expect(chat.status.value).toBe('idle')
  })

  it('失败后保留问题并允许重试', async () => {
    let attempt = 0
    const client: ChatClient = {
      async *streamAnswer() {
        attempt += 1
        if (attempt === 1) throw new Error('网络中断')
        yield { type: 'delta', delta: '重试成功' }
        yield { type: 'done' }
      },
    }
    const chat = useKnowledgeChat(client)

    await chat.sendMessage('请重试')
    expect(chat.status.value).toBe('error')
    expect(chat.errorMessage.value).toBe('网络中断')

    await chat.retryLastMessage()
    expect(chat.messages.value.at(-1)).toMatchObject({ content: '重试成功', status: 'complete' })
    expect(chat.messages.value.filter(message => message.role === 'user')).toHaveLength(1)
  })
})
```

- [ ] **步骤 2：运行测试并确认失败**

运行：

```bash
pnpm test -- --project unit tests/unit/useKnowledgeChat.spec.ts
```

预期：FAIL，提示找不到 `app/types/chat.ts` 或 `useKnowledgeChat`。

- [ ] **步骤 3：定义聊天类型与演示客户端**

创建 `app/types/chat.ts`：

```ts
export type ChatRole = 'user' | 'assistant'
export type ChatMessageStatus = 'complete' | 'streaming' | 'stopped' | 'error'
export type ChatStatus = 'idle' | 'streaming' | 'error'

export interface ChatCitation {
  id: string
  title: string
  excerpt: string
}

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  status: ChatMessageStatus
  citations?: ChatCitation[]
}

export type ChatStreamEvent =
  | { type: 'delta'; delta: string }
  | { type: 'done'; citations?: ChatCitation[] }

export interface ChatClient {
  streamAnswer(question: string, signal: AbortSignal): AsyncIterable<ChatStreamEvent>
}
```

创建 `app/services/demo-chat-client.ts`：

```ts
import type { ChatClient } from '../types/chat'

const demoText = '这是首页布局阶段的演示回答。真实接入后，我会从 April 的知识库检索内容，并在这里流式展示答案与引用来源。'

export function createDemoChatClient(): ChatClient {
  return {
    async *streamAnswer(_question, signal) {
      for (const delta of demoText.match(/.{1,8}/gu) ?? []) {
        if (signal.aborted) return
        await new Promise(resolve => setTimeout(resolve, 45))
        if (signal.aborted) return
        yield { type: 'delta', delta }
      }
      yield {
        type: 'done',
        citations: [{ id: 'demo-source', title: 'April 的知识库', excerpt: '真实接口将在后续阶段接入。' }],
      }
    },
  }
}
```

- [ ] **步骤 4：实现最小聊天状态机**

创建 `app/composables/useKnowledgeChat.ts`：

```ts
import { computed, reactive, ref } from 'vue'
import { createDemoChatClient } from '../services/demo-chat-client'
import type { ChatClient, ChatMessage, ChatStatus } from '../types/chat'

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
}

export function useKnowledgeChat(client: ChatClient = createDemoChatClient()) {
  const messages = ref<ChatMessage[]>([])
  const status = ref<ChatStatus>('idle')
  const errorMessage = ref('')
  const lastQuestion = ref('')
  let activeController: AbortController | undefined

  const isStreaming = computed(() => status.value === 'streaming')

  async function sendMessage(rawQuestion: string) {
    const question = rawQuestion.trim()
    if (!question || isStreaming.value) return

    lastQuestion.value = question
    errorMessage.value = ''
    status.value = 'streaming'
    activeController = new AbortController()

    messages.value.push({ id: createId(), role: 'user', content: question, status: 'complete' })
    const assistant = reactive<ChatMessage>({
      id: createId(),
      role: 'assistant',
      content: '',
      status: 'streaming',
    })
    messages.value.push(assistant)

    try {
      for await (const event of client.streamAnswer(question, activeController.signal)) {
        if (event.type === 'delta') assistant.content += event.delta
        if (event.type === 'done') {
          assistant.citations = event.citations
          assistant.status = 'complete'
        }
      }
      if (activeController.signal.aborted) assistant.status = 'stopped'
      else if (assistant.status === 'streaming') assistant.status = 'complete'
      status.value = 'idle'
    }
    catch (error) {
      if (activeController.signal.aborted) {
        assistant.status = 'stopped'
        status.value = 'idle'
        return
      }
      assistant.status = 'error'
      errorMessage.value = error instanceof Error ? error.message : '回答生成失败，请稍后重试。'
      status.value = 'error'
    }
    finally {
      activeController = undefined
    }
  }

  function stopGenerating() {
    activeController?.abort()
  }

  async function retryLastMessage() {
    const question = lastQuestion.value
    if (!question || isStreaming.value) return
    if (messages.value.at(-1)?.status === 'error') messages.value.pop()
    if (messages.value.at(-1)?.role === 'user' && messages.value.at(-1)?.content === question) {
      messages.value.pop()
    }
    await sendMessage(question)
  }

  return {
    messages,
    status,
    errorMessage,
    isStreaming,
    sendMessage,
    stopGenerating,
    retryLastMessage,
  }
}
```

- [ ] **步骤 5：运行状态机测试**

运行：

```bash
pnpm test -- --project unit tests/unit/useKnowledgeChat.spec.ts
```

预期：4 个测试全部 PASS。

- [ ] **步骤 6：提交聊天领域层**

```bash
git add app/types/chat.ts app/services/demo-chat-client.ts app/composables/useKnowledgeChat.ts tests/unit/useKnowledgeChat.spec.ts
git commit -m "feat(聊天): 添加可替换的演示流状态机"
```

### 任务 3：用 TDD 实现顶部导航

**文件：**

- 创建：`tests/nuxt/AppHeader.spec.ts`
- 创建：`app/components/AppHeader.vue`

- [ ] **步骤 1：编写失败的导航测试**

创建 `tests/nuxt/AppHeader.spec.ts`：

```ts
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import AppHeader from '../../app/components/AppHeader.vue'

describe('AppHeader', () => {
  it('展示品牌和所有主要导航入口', async () => {
    const wrapper = await mountSuspended(AppHeader)

    expect(wrapper.get('[data-testid="brand"]').text()).toContain('april.dev')
    expect(wrapper.get('a[href="/articles"]').text()).toBe('文章')
    expect(wrapper.get('a[href="/timeline"]').text()).toBe('时间轴')
    expect(wrapper.get('a[href="/about"]').text()).toBe('关于')
    expect(wrapper.get('a[href="https://github.com/AprilTong"]').attributes('target')).toBe('_blank')
  })

  it('移动菜单按钮可以切换导航可见状态', async () => {
    const wrapper = await mountSuspended(AppHeader)
    const button = wrapper.get('button[aria-controls="primary-navigation"]')

    expect(button.attributes('aria-expanded')).toBe('false')
    await button.trigger('click')
    expect(button.attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('#primary-navigation').classes()).toContain('is-open')
  })
})
```

- [ ] **步骤 2：运行测试并确认失败**

运行：

```bash
pnpm test -- --project nuxt tests/nuxt/AppHeader.spec.ts
```

预期：FAIL，提示找不到 `AppHeader.vue`。

- [ ] **步骤 3：实现可访问的胶囊导航**

创建 `app/components/AppHeader.vue`：

```vue
<script setup lang="ts">
const isMenuOpen = ref(false)

function closeMenu() {
  isMenuOpen.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closeMenu()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <header class="app-header">
    <NuxtLink data-testid="brand" class="brand" to="/" aria-label="April 博客首页">
      <span class="brand__mark" aria-hidden="true">A</span>
      <span>april.dev</span>
    </NuxtLink>

    <button
      class="menu-toggle"
      type="button"
      aria-controls="primary-navigation"
      :aria-expanded="isMenuOpen"
      aria-label="切换导航菜单"
      @click="isMenuOpen = !isMenuOpen"
    >
      <span aria-hidden="true">☰</span>
    </button>

    <nav id="primary-navigation" :class="['primary-nav', { 'is-open': isMenuOpen }]" aria-label="主导航">
      <NuxtLink to="/articles" @click="closeMenu">文章</NuxtLink>
      <NuxtLink to="/timeline" @click="closeMenu">时间轴</NuxtLink>
      <NuxtLink to="/about" @click="closeMenu">关于</NuxtLink>
      <a href="https://github.com/AprilTong" target="_blank" rel="noreferrer" @click="closeMenu">GitHub ↗</a>
    </nav>
  </header>
</template>
```

- [ ] **步骤 4：运行导航测试**

运行：

```bash
pnpm test -- --project nuxt tests/nuxt/AppHeader.spec.ts
```

预期：2 个测试全部 PASS。

- [ ] **步骤 5：提交导航组件**

```bash
git add app/components/AppHeader.vue tests/nuxt/AppHeader.spec.ts
git commit -m "feat(首页): 添加响应式胶囊导航"
```

### 任务 4：用 TDD 实现欢迎态与输入区

**文件：**

- 创建：`tests/nuxt/ChatWelcome.spec.ts`
- 创建：`tests/nuxt/ChatComposer.spec.ts`
- 创建：`app/components/chat/ChatWelcome.vue`
- 创建：`app/components/chat/ChatComposer.vue`

- [ ] **步骤 1：编写失败的欢迎态测试**

创建 `tests/nuxt/ChatWelcome.spec.ts`：

```ts
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import ChatWelcome from '../../app/components/chat/ChatWelcome.vue'

describe('ChatWelcome', () => {
  it('展示能力说明并发送快捷问题', async () => {
    const wrapper = await mountSuspended(ChatWelcome)

    expect(wrapper.get('h1').text()).toBe('今天想了解什么？')
    expect(wrapper.text()).toContain('技术笔记和知识文档')
    const prompts = wrapper.findAll('[data-testid="quick-prompt"]')
    expect(prompts).toHaveLength(3)
    await prompts[0]!.trigger('click')
    expect(wrapper.emitted('select')?.[0]).toEqual(['浏览器指纹是什么？'])
  })
})
```

- [ ] **步骤 2：编写失败的输入区测试**

创建 `tests/nuxt/ChatComposer.spec.ts`：

```ts
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import ChatComposer from '../../app/components/chat/ChatComposer.vue'

describe('ChatComposer', () => {
  it('提交去除首尾空格后的问题并清空输入', async () => {
    const wrapper = await mountSuspended(ChatComposer, { props: { streaming: false } })
    const textarea = wrapper.get('textarea')
    await textarea.setValue('  浏览器指纹是什么？  ')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.emitted('send')?.[0]).toEqual(['浏览器指纹是什么？'])
    expect((textarea.element as HTMLTextAreaElement).value).toBe('')
  })

  it('生成中显示停止按钮并发出 stop', async () => {
    const wrapper = await mountSuspended(ChatComposer, { props: { streaming: true } })
    const stop = wrapper.get('button[aria-label="停止生成"]')
    await stop.trigger('click')
    expect(wrapper.emitted('stop')).toHaveLength(1)
  })

  it('桌面端 Enter 发送，Shift+Enter 不发送', async () => {
    const wrapper = await mountSuspended(ChatComposer, { props: { streaming: false } })
    const textarea = wrapper.get('textarea')
    await textarea.setValue('快捷键问题')
    await textarea.trigger('keydown', { key: 'Enter', shiftKey: true })
    expect(wrapper.emitted('send')).toBeUndefined()
    await textarea.trigger('keydown', { key: 'Enter', shiftKey: false })
    expect(wrapper.emitted('send')?.[0]).toEqual(['快捷键问题'])
  })
})
```

- [ ] **步骤 3：运行测试并确认失败**

运行：

```bash
pnpm test -- --project nuxt tests/nuxt/ChatWelcome.spec.ts tests/nuxt/ChatComposer.spec.ts
```

预期：FAIL，提示缺少两个组件。

- [ ] **步骤 4：实现欢迎态**

创建 `app/components/chat/ChatWelcome.vue`：

```vue
<script setup lang="ts">
const emit = defineEmits<{ select: [question: string] }>()
const prompts = ['浏览器指纹是什么？', 'axios 有哪些实用工具函数？', '推荐一条 Vue 学习路径']
</script>

<template>
  <section class="chat-welcome" aria-labelledby="chat-title">
    <div class="ai-orb" aria-hidden="true">✦</div>
    <p class="chat-welcome__eyebrow">APRIL AI · KNOWLEDGE ONLINE</p>
    <h1 id="chat-title">今天想了解什么？</h1>
    <p class="chat-welcome__description">
      我会从 April 的技术笔记和知识文档中寻找答案，并提供可核对的引用来源。
    </p>
    <div class="quick-prompts" aria-label="快捷问题">
      <button
        v-for="prompt in prompts"
        :key="prompt"
        data-testid="quick-prompt"
        type="button"
        @click="emit('select', prompt)"
      >
        {{ prompt }}
      </button>
    </div>
  </section>
</template>
```

- [ ] **步骤 5：实现输入区**

创建 `app/components/chat/ChatComposer.vue`：

```vue
<script setup lang="ts">
const props = defineProps<{ streaming: boolean }>()
const emit = defineEmits<{ send: [question: string]; stop: [] }>()
const question = ref('')

function submit() {
  const value = question.value.trim()
  if (!value || props.streaming) return
  emit('send', value)
  question.value = ''
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey) return
  if (window.matchMedia?.('(pointer: coarse)').matches) return
  event.preventDefault()
  submit()
}
</script>

<template>
  <form class="chat-composer" aria-label="发送问题" @submit.prevent="submit">
    <textarea
      v-model="question"
      rows="1"
      placeholder="输入问题，Enter 发送…"
      aria-label="输入问题"
      :disabled="streaming"
      @keydown="onKeydown"
    />
    <button v-if="streaming" type="button" aria-label="停止生成" @click="emit('stop')">■</button>
    <button v-else type="submit" aria-label="发送问题" :disabled="!question.trim()">发送 ↑</button>
  </form>
</template>
```

- [ ] **步骤 6：运行组件测试**

运行：

```bash
pnpm test -- --project nuxt tests/nuxt/ChatWelcome.spec.ts tests/nuxt/ChatComposer.spec.ts
```

预期：4 个测试全部 PASS。

- [ ] **步骤 7：提交欢迎态与输入区**

```bash
git add app/components/chat/ChatWelcome.vue app/components/chat/ChatComposer.vue tests/nuxt/ChatWelcome.spec.ts tests/nuxt/ChatComposer.spec.ts
git commit -m "feat(聊天): 添加欢迎态与消息输入区"
```

### 任务 5：用 TDD 实现消息、引用与错误状态

**文件：**

- 创建：`tests/nuxt/ChatMessageList.spec.ts`
- 创建：`app/components/chat/ChatMessage.vue`
- 创建：`app/components/chat/ChatMessageList.vue`
- 创建：`app/components/chat/ChatStatusNotice.vue`

- [ ] **步骤 1：编写失败的消息列表测试**

创建 `tests/nuxt/ChatMessageList.spec.ts`：

```ts
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import ChatMessageList from '../../app/components/chat/ChatMessageList.vue'
import ChatStatusNotice from '../../app/components/chat/ChatStatusNotice.vue'

describe('ChatMessageList', () => {
  it('区分用户与助手消息并展示引用', async () => {
    const wrapper = await mountSuspended(ChatMessageList, {
      props: {
        messages: [
          { id: 'u1', role: 'user', content: '问题', status: 'complete' },
          {
            id: 'a1',
            role: 'assistant',
            content: '回答',
            status: 'complete',
            citations: [{ id: 'c1', title: '来源标题', excerpt: '来源摘要' }],
          },
        ],
      },
    })

    expect(wrapper.get('[data-role="user"]').text()).toContain('问题')
    expect(wrapper.get('[data-role="assistant"]').text()).toContain('回答')
    expect(wrapper.text()).toContain('来源标题')

    const writeText = vi.fn()
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    await wrapper.get('button[aria-label="复制回答"]').trigger('click')
    expect(writeText).toHaveBeenCalledWith('回答')
  })

  it('展示已停止状态', async () => {
    const wrapper = await mountSuspended(ChatMessageList, {
      props: { messages: [{ id: 'a1', role: 'assistant', content: '部分回答', status: 'stopped' }] },
    })
    expect(wrapper.text()).toContain('已停止生成')
  })
})

describe('ChatStatusNotice', () => {
  it('展示错误并触发重试', async () => {
    const wrapper = await mountSuspended(ChatStatusNotice, { props: { message: '网络中断' } })
    expect(wrapper.get('[role="alert"]').text()).toContain('网络中断')
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })
})
```

- [ ] **步骤 2：运行测试并确认失败**

运行：

```bash
pnpm test -- --project nuxt tests/nuxt/ChatMessageList.spec.ts
```

预期：FAIL，提示缺少消息组件。

- [ ] **步骤 3：实现消息与引用展示**

创建 `app/components/chat/ChatMessage.vue`：

```vue
<script setup lang="ts">
import type { ChatMessage } from '../../types/chat'
const props = defineProps<{ message: ChatMessage }>()
const copied = ref(false)

async function copyMessage() {
  await navigator.clipboard.writeText(props.message.content)
  copied.value = true
}
</script>

<template>
  <article :data-role="message.role" :class="['chat-message', `chat-message--${message.role}`]">
    <span class="chat-message__label">{{ message.role === 'user' ? 'YOU' : 'APRIL AI' }}</span>
    <MDC v-if="message.content" class="chat-message__content" :value="message.content" />
    <p v-else>正在思考…</p>
    <button
      v-if="message.role === 'assistant' && message.content"
      type="button"
      aria-label="复制回答"
      @click="copyMessage"
    >
      {{ copied ? '已复制' : '复制' }}
    </button>
    <span v-if="message.status === 'stopped'" class="chat-message__state">已停止生成</span>
    <span v-if="message.status === 'error'" class="chat-message__state">回答生成失败</span>
    <details v-if="message.citations?.length" class="citations">
      <summary>查看 {{ message.citations.length }} 条引用来源</summary>
      <article v-for="citation in message.citations" :key="citation.id">
        <strong>{{ citation.title }}</strong>
        <p>{{ citation.excerpt }}</p>
      </article>
    </details>
  </article>
</template>
```

创建 `app/components/chat/ChatMessageList.vue`：

```vue
<script setup lang="ts">
import type { ChatMessage } from '../../types/chat'

const props = defineProps<{ messages: ChatMessage[] }>()
const list = useTemplateRef<HTMLElement>('list')

watch(
  () => props.messages.map(message => message.content).join(''),
  async () => {
    await nextTick()
    list.value?.scrollTo({ top: list.value.scrollHeight, behavior: 'smooth' })
  },
)
</script>

<template>
  <section ref="list" class="message-list" aria-live="polite" aria-label="对话消息">
    <ChatMessage v-for="message in messages" :key="message.id" :message="message" />
  </section>
</template>
```

创建 `app/components/chat/ChatStatusNotice.vue`：

```vue
<script setup lang="ts">
defineProps<{ message: string }>()
const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="status-notice" role="alert">
    <span>{{ message }}</span>
    <button type="button" @click="emit('retry')">重新发送</button>
  </div>
</template>
```

- [ ] **步骤 4：运行消息测试**

运行：

```bash
pnpm test -- --project nuxt tests/nuxt/ChatMessageList.spec.ts
```

预期：3 个测试全部 PASS。

- [ ] **步骤 5：提交消息与状态组件**

```bash
git add app/components/chat/ChatMessage.vue app/components/chat/ChatMessageList.vue app/components/chat/ChatStatusNotice.vue tests/nuxt/ChatMessageList.spec.ts
git commit -m "feat(聊天): 添加消息引用与错误状态"
```

### 任务 6：用 TDD 集成纯 Chat 首页壳

**文件：**

- 创建：`tests/nuxt/KnowledgeChatShell.spec.ts`
- 创建：`app/components/chat/KnowledgeChatShell.vue`

- [ ] **步骤 1：编写失败的聊天壳测试**

创建 `tests/nuxt/KnowledgeChatShell.spec.ts`：

```ts
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import KnowledgeChatShell from '../../app/components/chat/KnowledgeChatShell.vue'

describe('KnowledgeChatShell', () => {
  it('初始展示欢迎态，发送后切换消息态', async () => {
    const wrapper = await mountSuspended(KnowledgeChatShell)

    expect(wrapper.findComponent({ name: 'ChatWelcome' }).exists()).toBe(true)
    await wrapper.get('textarea').setValue('测试问题')
    await wrapper.get('form').trigger('submit')

    await vi.waitFor(() => expect(wrapper.text()).toContain('测试问题'))
    expect(wrapper.findComponent({ name: 'ChatWelcome' }).exists()).toBe(false)
    expect(wrapper.find('[aria-label="对话消息"]').exists()).toBe(true)
  })

  it('点击快捷问题直接开始对话', async () => {
    const wrapper = await mountSuspended(KnowledgeChatShell)
    await wrapper.findAll('[data-testid="quick-prompt"]')[0]!.trigger('click')
    await vi.waitFor(() => expect(wrapper.text()).toContain('浏览器指纹是什么？'))
  })
})
```

- [ ] **步骤 2：运行测试并确认失败**

运行：

```bash
pnpm test -- --project nuxt tests/nuxt/KnowledgeChatShell.spec.ts
```

预期：FAIL，提示找不到 `KnowledgeChatShell.vue`。

- [ ] **步骤 3：实现聊天壳集成**

创建 `app/components/chat/KnowledgeChatShell.vue`：

```vue
<script setup lang="ts">
const chat = useKnowledgeChat()
</script>

<template>
  <section class="knowledge-chat" aria-label="April AI 知识库对话">
    <header class="knowledge-chat__header">
      <div>
        <span class="knowledge-chat__terminal" aria-hidden="true">▣</span>
        <strong>April AI / 知识库对话</strong>
      </div>
      <span class="knowledge-chat__online">ONLINE · DEMO STREAM</span>
    </header>

    <div class="knowledge-chat__body">
      <ChatWelcome v-if="chat.messages.value.length === 0" @select="chat.sendMessage" />
      <ChatMessageList v-else :messages="chat.messages.value" />
    </div>

    <ChatStatusNotice
      v-if="chat.status.value === 'error'"
      :message="chat.errorMessage.value"
      @retry="chat.retryLastMessage"
    />

    <ChatComposer
      :streaming="chat.isStreaming.value"
      @send="chat.sendMessage"
      @stop="chat.stopGenerating"
    />

    <footer class="knowledge-chat__footer">
      <span>AI 可能会犯错，请核对引用来源</span>
      <span>Powered by April's Knowledge Base</span>
    </footer>
  </section>
</template>
```

- [ ] **步骤 4：运行聊天壳测试**

运行：

```bash
pnpm test -- --project nuxt tests/nuxt/KnowledgeChatShell.spec.ts
```

预期：2 个测试全部 PASS。

- [ ] **步骤 5：提交聊天壳**

```bash
git add app/components/chat/KnowledgeChatShell.vue tests/nuxt/KnowledgeChatShell.spec.ts
git commit -m "feat(首页): 集成纯 Chat 首页交互"
```

### 任务 7：实现深空视觉、首页 SEO 与响应式布局

**文件：**

- 创建：`tests/nuxt/index-page.spec.ts`
- 创建：`app/pages/index.vue`
- 修改：`app/assets/css/main.css`

- [ ] **步骤 1：编写失败的根页面测试**

创建 `tests/nuxt/index-page.spec.ts`：

```ts
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import IndexPage from '../../app/pages/index.vue'

describe('首页', () => {
  it('只装配导航和聊天主体，不渲染文章卡片', async () => {
    const wrapper = await mountSuspended(IndexPage)

    expect(wrapper.get('main').attributes('aria-label')).toBe('AI 知识库首页')
    expect(wrapper.find('[aria-label="April AI 知识库对话"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="article-card"]').exists()).toBe(false)
  })
})
```

- [ ] **步骤 2：运行测试并确认失败**

运行：

```bash
pnpm test -- --project nuxt tests/nuxt/index-page.spec.ts
```

预期：FAIL，提示找不到 `app/pages/index.vue`。

- [ ] **步骤 3：创建首页并配置 SEO**

创建 `app/pages/index.vue`：

```vue
<script setup lang="ts">
useSeoMeta({
  title: 'April AI｜从我的技术笔记中寻找答案',
  description: '与 April 的个人知识库对话，检索前端技术笔记、源码学习与实践记录。',
  ogTitle: 'April AI｜个人知识库',
  ogDescription: '从技术笔记和知识文档中寻找答案。',
  ogType: 'website',
})

useHead({
  link: [{ rel: 'canonical', href: 'https://blog.april-tong.cn/' }],
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'April AI',
      url: 'https://blog.april-tong.cn/',
      author: { '@type': 'Person', name: 'AprilTong' },
    }),
  }],
})
</script>

<template>
  <div class="home-shell">
    <AppHeader />
    <main aria-label="AI 知识库首页">
      <KnowledgeChatShell />
    </main>
  </div>
</template>
```

- [ ] **步骤 4：补齐深空视觉样式**

将以下样式追加到 `app/assets/css/main.css`。保持类名与组件一致，不引入 Tailwind 或第三方组件库：

```css
body {
  min-width: 320px;
  background:
    radial-gradient(circle at 82% 0%, rgb(39 197 218 / 18%), transparent 34%),
    radial-gradient(circle at 0% 58%, rgb(104 80 226 / 18%), transparent 33%),
    #070b12;
}

body::before {
  position: fixed;
  inset: 0;
  z-index: -1;
  content: "";
  background-image:
    linear-gradient(rgb(141 167 195 / 7%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(141 167 195 / 7%) 1px, transparent 1px);
  background-size: 36px 36px;
  mask-image: linear-gradient(to bottom, black, transparent 92%);
}

.home-shell {
  width: min(100% - 32px, 1220px);
  min-height: 100dvh;
  margin: 0 auto;
  padding: 16px 0;
}

.app-header,
.knowledge-chat {
  border: 1px solid rgb(178 207 232 / 15%);
  background: linear-gradient(145deg, rgb(190 214 235 / 10%), rgb(100 120 148 / 4%));
  box-shadow: 0 24px 80px rgb(0 0 0 / 28%);
  backdrop-filter: blur(22px);
}

.app-header {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 56px;
  padding: 8px 14px;
  border-radius: 999px;
}

.brand,
.primary-nav a {
  color: inherit;
  text-decoration: none;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
}

.brand__mark {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 10px;
  background: linear-gradient(135deg, #66e1ff, #987cff);
  color: #07101a;
  box-shadow: 0 0 25px rgb(102 225 255 / 35%);
}

.primary-nav {
  display: flex;
  align-items: center;
  gap: 6px;
}

.primary-nav a {
  padding: 9px 13px;
  border-radius: 999px;
  color: #9ba8ba;
  font-size: 14px;
}

.primary-nav a:hover {
  background: rgb(255 255 255 / 7%);
  color: #eef4ff;
}

.menu-toggle {
  display: none;
}

main {
  min-height: calc(100dvh - 88px);
  padding-top: 16px;
}

.knowledge-chat {
  display: grid;
  min-height: calc(100dvh - 104px);
  grid-template-rows: auto minmax(0, 1fr) auto auto;
  overflow: hidden;
  border-radius: 28px;
}

.knowledge-chat__header,
.knowledge-chat__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 15px 18px;
  color: #8392a5;
  font-size: 12px;
}

.knowledge-chat__header {
  border-bottom: 1px solid rgb(178 207 232 / 12%);
}

.knowledge-chat__header strong {
  margin-left: 8px;
  color: #eef4ff;
}

.knowledge-chat__online,
.knowledge-chat__terminal,
.chat-welcome__eyebrow,
.chat-message__label {
  color: #6bddff;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: 0.12em;
}

.knowledge-chat__body {
  min-height: 0;
}

.chat-welcome {
  display: flex;
  min-height: 100%;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 56px 24px 24px;
  text-align: center;
}

.ai-orb {
  display: grid;
  width: 76px;
  height: 76px;
  place-items: center;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #e5fdff, #68d8f1 30%, #5a4fd7 75%);
  box-shadow: 0 0 48px rgb(91 214 242 / 38%);
  color: #07101a;
  font-size: 24px;
}

.chat-welcome h1 {
  margin: 14px 0 8px;
  font-size: clamp(32px, 5vw, 56px);
  letter-spacing: -0.04em;
}

.chat-welcome__description {
  max-width: 620px;
  margin: 0;
  color: #8d9bae;
  line-height: 1.75;
}

.quick-prompts {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 26px;
}

.quick-prompts button,
.status-notice button {
  border: 1px solid rgb(157 204 228 / 22%);
  border-radius: 999px;
  background: rgb(188 216 233 / 7%);
  color: #aab9ca;
  cursor: pointer;
  padding: 10px 14px;
}

.message-list {
  height: 100%;
  overflow-y: auto;
  padding: 28px;
}

.chat-message {
  width: min(78%, 760px);
  margin-bottom: 18px;
  padding: 16px 18px;
  border: 1px solid rgb(178 207 232 / 13%);
  border-radius: 18px;
  background: rgb(190 214 235 / 6%);
}

.chat-message--user {
  margin-left: auto;
  background: rgb(107 221 255 / 10%);
}

.chat-message p {
  line-height: 1.7;
  white-space: pre-wrap;
}

.chat-message__state {
  color: #8d9bae;
  font-size: 12px;
}

.citations {
  border-top: 1px solid rgb(178 207 232 / 12%);
  padding-top: 10px;
  color: #9ba8ba;
}

.status-notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 18px 12px;
  padding: 10px 12px;
  border: 1px solid rgb(255 142 142 / 28%);
  border-radius: 14px;
  background: rgb(111 25 35 / 20%);
}

.chat-composer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  margin: 0 18px;
  padding: 10px;
  border: 1px solid rgb(155 201 225 / 22%);
  border-radius: 18px;
  background: rgb(6 11 18 / 68%);
}

.chat-composer textarea {
  max-height: 160px;
  resize: none;
  border: 0;
  outline: 0;
  background: transparent;
  color: #eef4ff;
  padding: 10px;
}

.chat-composer button {
  align-self: end;
  border: 1px solid rgb(107 221 255 / 28%);
  border-radius: 12px;
  background: rgb(85 207 231 / 18%);
  color: #dffaff;
  cursor: pointer;
  padding: 10px 14px;
}

.chat-composer button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

@media (max-width: 720px) {
  .home-shell {
    width: min(100% - 16px, 1220px);
    padding: 8px 0;
  }

  .menu-toggle {
    display: grid;
    width: 38px;
    height: 38px;
    place-items: center;
    border: 0;
    border-radius: 50%;
    background: rgb(255 255 255 / 7%);
    color: #eef4ff;
  }

  .primary-nav {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    display: none;
    width: 190px;
    align-items: stretch;
    flex-direction: column;
    padding: 8px;
    border: 1px solid rgb(178 207 232 / 15%);
    border-radius: 18px;
    background: #101824;
  }

  .primary-nav.is-open {
    display: flex;
  }

  main {
    min-height: calc(100dvh - 72px);
    padding-top: 8px;
  }

  .knowledge-chat {
    min-height: calc(100dvh - 80px);
    border-radius: 20px;
  }

  .knowledge-chat__header,
  .knowledge-chat__footer {
    font-size: 10px;
  }

  .knowledge-chat__online,
  .knowledge-chat__footer span:last-child {
    display: none;
  }

  .chat-welcome {
    padding: 36px 18px 18px;
  }

  .quick-prompts {
    align-items: stretch;
    flex-direction: column;
    width: 100%;
  }

  .message-list {
    padding: 16px;
  }

  .chat-message {
    width: 92%;
  }

  .chat-composer {
    margin: 0 10px;
    padding-bottom: max(10px, env(safe-area-inset-bottom));
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

- [ ] **步骤 5：运行页面测试、全量测试与类型检查**

运行：

```bash
pnpm test -- --project nuxt tests/nuxt/index-page.spec.ts
pnpm test
pnpm typecheck
```

预期：全部测试 PASS，类型检查退出码为 0。

- [ ] **步骤 6：提交首页视觉与 SEO**

```bash
git add app/pages/index.vue app/assets/css/main.css tests/nuxt/index-page.spec.ts
git commit -m "feat(首页): 完成深空纯 Chat 首页视觉"
```

### 任务 8：生产构建与浏览器视觉验收

**文件：**

- 修改：仅修改视觉验收发现问题所对应的组件或 `app/assets/css/main.css`

- [ ] **步骤 1：执行完整自动验证**

运行：

```bash
pnpm test
pnpm typecheck
pnpm build
```

预期：所有命令退出码为 0；生产构建生成 `.output/`。

- [ ] **步骤 2：启动开发服务器**

运行：

```bash
pnpm dev --host 127.0.0.1
```

预期：开发服务器输出本地访问地址，首页返回 HTTP 200。

- [ ] **步骤 3：完成桌面端视觉检查**

使用浏览器打开首页，并将视口设置为 `1440 × 900`。检查以下项目：

- 胶囊导航位于顶部且不遮挡内容。
- Chat 面板占据主要视口，没有文章卡片。
- AI 光球、标题、快捷问题和输入区层级清晰。
- 页面没有横向滚动条。
- 输入问题后欢迎态切换为消息态，演示回答逐段出现。
- 点击「停止生成」后保留已有回答，并显示「已停止生成」。

- [ ] **步骤 4：完成移动端视觉检查**

将视口设置为 `390 × 844`，重新加载首页。检查以下项目：

- 顶部只展示品牌和菜单按钮。
- 菜单按钮可展开并通过键盘关闭或继续导航。
- Chat 面板填满可用高度，输入区不被视口底部遮挡。
- 快捷问题纵向排列，点击区域足够大。
- 消息不会溢出屏幕，引用内容可以展开。

- [ ] **步骤 5：检查控制台和减少动态效果**

检查浏览器控制台没有 Vue hydration、未捕获 Promise 或无障碍相关错误。启用 `prefers-reduced-motion: reduce`，确认页面仍可使用且不存在持续动画。

- [ ] **步骤 6：修复验收问题并重新验证**

每次修改后运行：

```bash
pnpm test
pnpm typecheck
pnpm build
```

预期：全部命令继续通过，并重新完成对应视口检查。

- [ ] **步骤 7：提交最终验收修正**

如果视觉验收没有产生代码修改，则跳过本步骤。若有修改，运行：

```bash
git add app tests
git commit -m "fix(首页): 修正响应式与视觉验收问题"
```

## 最终完成条件

- `pnpm test` 全部通过。
- `pnpm typecheck` 退出码为 0。
- `pnpm build` 退出码为 0。
- 桌面端 `1440 × 900` 与移动端 `390 × 844` 视觉验收通过。
- 首页只展示导航与 AI 聊天，不展示文章卡片。
- 演示流支持发送、停止、错误和重试 UI。
- 所有实现提交均遵循中文 Conventional Commits。
