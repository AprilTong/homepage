import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import KnowledgeChatShell from '~/components/chat/KnowledgeChatShell.vue'
import { PublicChatError } from '~/types/chat'
import type { ChatCitation, ChatClient } from '~/types/chat'

const mountedWrappers = new Set<VueWrapper>()

afterEach(async () => {
  for (const wrapper of mountedWrappers) {
    const stopButton = wrapper.find('button[aria-label="停止生成"]')
    if (stopButton.exists()) {
      await stopButton.trigger('click')
      await flushPromises()
    }

    wrapper.unmount()
  }

  mountedWrappers.clear()
})

async function mountShell(client: ChatClient) {
  const wrapper = await mountSuspended(KnowledgeChatShell, {
    props: { client },
  })
  mountedWrappers.add(wrapper)
  return wrapper
}

function createCompletedClient(
  answer = '这是可控回答。',
  citations?: ChatCitation[],
) {
  const questions: string[] = []
  const client: ChatClient = {
    async *streamAnswer(question) {
      questions.push(question)
      yield { type: 'delta', delta: answer }
      yield { type: 'done', citations }
    },
  }

  return { client, questions }
}

function waitUntilAborted(signal: AbortSignal) {
  return new Promise<never>((_resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('生成已停止', 'AbortError'))
      return
    }

    signal.addEventListener(
      'abort',
      () => reject(new DOMException('生成已停止', 'AbortError')),
      { once: true },
    )
  })
}

describe('KnowledgeChatShell', () => {
  it('展示完整欢迎壳，提交输入后切换为对话消息区', async () => {
    const { client } = createCompletedClient()
    const wrapper = await mountShell(client)
    const shell = wrapper.get('section.knowledge-chat')
    const body = shell.get('.knowledge-chat__body')
    const composer = shell.get('form.chat-composer')
    const footer = shell.get('.knowledge-chat__footer')

    expect(shell.attributes('aria-label')).toBe('April AI 知识库对话')
    expect(shell.get('.knowledge-chat__terminal').attributes('aria-hidden')).toBe('true')
    expect(shell.get('strong.knowledge-chat__brand').text()).toBe('April AI / 知识库对话')
    expect(shell.find('.knowledge-chat__online').exists()).toBe(false)
    expect(body.element.parentElement).toBe(shell.element)
    expect(body.find('.chat-welcome').exists()).toBe(true)
    expect(body.find('.chat-composer').exists()).toBe(false)
    expect(body.find('.status-notice').exists()).toBe(false)
    expect(composer.element.parentElement).toBe(shell.element)
    expect(footer.element.parentElement).toBe(shell.element)
    expect(footer.findAll('span').map(element => element.text())).toEqual([
      'AI 可能会犯错，请核对引用来源',
      "Powered by April's Knowledge Base",
    ])

    await shell.get('textarea[aria-label="输入问题"]').setValue('如何开始学习 Vue？')
    await shell.get('form.chat-composer').trigger('submit')
    await flushPromises()

    expect(shell.find('.chat-welcome').exists()).toBe(false)
    expect(body.get('section.message-list').attributes('aria-label')).toBe('对话消息')
    expect(shell.get('[data-role="user"]').text()).toContain('如何开始学习 Vue？')
  })

  it('点击第一个快捷问题会直接开始对应对话', async () => {
    const { client, questions } = createCompletedClient()
    const wrapper = await mountShell(client)

    await wrapper.get('[data-testid="quick-prompt"]').trigger('click')
    await flushPromises()

    expect(questions).toEqual(['浏览器指纹是什么？'])
    expect(wrapper.find('.chat-welcome').exists()).toBe(false)
    expect(wrapper.get('[data-role="user"]').text()).toContain('浏览器指纹是什么？')
  })

  it('在流式回答完成后保留并渲染所有增量文本', async () => {
    const client: ChatClient = {
      async *streamAnswer() {
        yield { type: 'delta', delta: '**你好**，' }
        yield { type: 'delta', delta: '这是完整回答。' }
        yield { type: 'done' }
      },
    }
    const wrapper = await mountShell(client)

    await wrapper.get('textarea[aria-label="输入问题"]').setValue('你好')
    await wrapper.get('form.chat-composer').trigger('submit')
    await flushPromises()

    const assistant = wrapper.get('[data-role="assistant"]')
    expect(assistant.text()).toContain('**你好**，这是完整回答。')
  })

  it('流式生成时禁用输入，停止后标记回答并恢复输入', async () => {
    const questions: string[] = []
    const client: ChatClient = {
      async *streamAnswer(question, signal) {
        questions.push(question)
        yield { type: 'delta', delta: '正在生成的部分回答' }
        await waitUntilAborted(signal)
      },
    }
    const wrapper = await mountShell(client)

    await wrapper.get('textarea[aria-label="输入问题"]').setValue('请详细说明')
    await wrapper.get('form.chat-composer').trigger('submit')
    await flushPromises()

    expect(questions).toEqual(['请详细说明'])
    expect(wrapper.get('textarea[aria-label="输入问题"]').attributes()).toHaveProperty('disabled')
    const stopButton = wrapper.get('button[aria-label="停止生成"]')
    expect(wrapper.find('button[aria-label="发送问题"]').exists()).toBe(false)

    await stopButton.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('已停止生成')
    expect(wrapper.get('textarea[aria-label="输入问题"]').attributes()).not.toHaveProperty('disabled')
    expect(wrapper.find('button[aria-label="发送问题"]').exists()).toBe(true)
  })

  it('失败后显示错误，并以原问题重新发送且清除错误提示', async () => {
    const questions: string[] = []
    const client: ChatClient = {
      async *streamAnswer(question, signal) {
        questions.push(question)
        if (questions.length === 1) {
          throw new PublicChatError('知识库暂时不可用')
        }

        yield { type: 'delta', delta: '重试后的回答' }
        await waitUntilAborted(signal)
      },
    }
    const wrapper = await mountShell(client)

    await wrapper.get('textarea[aria-label="输入问题"]').setValue('原始问题')
    await wrapper.get('form.chat-composer').trigger('submit')
    await flushPromises()

    const notice = wrapper.get('[role="alert"]')
    expect(notice.text()).toContain('知识库暂时不可用')
    expect(notice.get('button').text()).toBe('重新发送')
    expect(notice.element.parentElement).toBe(wrapper.get('section.knowledge-chat').element)
    expect(wrapper.get('.knowledge-chat__body').find('[role="alert"]').exists()).toBe(false)

    await notice.get('button').trigger('click')
    await flushPromises()

    expect(questions).toEqual(['原始问题', '原始问题'])
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.get('[data-role="assistant"]').text()).toContain('重试后的回答')
    expect(wrapper.findAll('[data-role="user"]')).toHaveLength(1)
    expect(wrapper.find('button[aria-label="停止生成"]').exists()).toBe(true)
  })

  it('将完成事件的引用传递到消息列表', async () => {
    const { client } = createCompletedClient('引用回答', [{
      id: 'source-1',
      title: '浏览器指纹笔记',
      excerpt: '浏览器特征可组合成识别信号。',
    }])
    const wrapper = await mountShell(client)

    await wrapper.get('[data-testid="quick-prompt"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('summary').text()).toBe('查看 1 条引用来源')
    expect(wrapper.text()).toContain('浏览器指纹笔记')
    expect(wrapper.text()).toContain('浏览器特征可组合成识别信号。')
  })
})
