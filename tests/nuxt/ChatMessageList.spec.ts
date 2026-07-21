import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ChatMessageList from '~/components/chat/ChatMessageList.vue'
import ChatStatusNotice from '~/components/chat/ChatStatusNotice.vue'
import type { ChatMessage } from '~/types/chat'

const mountedWrappers = new Set<{ unmount: () => void }>()
const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard')

afterEach(() => {
  for (const wrapper of mountedWrappers) {
    wrapper.unmount()
  }

  mountedWrappers.clear()

  if (originalClipboardDescriptor) {
    Object.defineProperty(navigator, 'clipboard', originalClipboardDescriptor)
  }
  else {
    Reflect.deleteProperty(navigator, 'clipboard')
  }

  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function mountMessageList(messages: ChatMessage[]) {
  const wrapper = await mountSuspended(ChatMessageList, {
    props: { messages },
  })

  mountedWrappers.add(wrapper)
  return wrapper
}

function stubClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })
}

describe('ChatMessageList', () => {
  it('区分用户与助手消息并展示引用来源', async () => {
    const wrapper = await mountMessageList([
      { id: 'u1', role: 'user', content: '问题', status: 'complete' },
      {
        id: 'a1',
        role: 'assistant',
        content: '回答',
        status: 'complete',
        citations: [{ id: 'c1', title: '来源标题', excerpt: '来源摘要' }],
      },
    ])

    const list = wrapper.get('section.message-list')
    const userMessage = list.get('[data-role="user"]')
    const assistantMessage = list.get('[data-role="assistant"]')

    expect(list.attributes('aria-live')).toBe('polite')
    expect(list.attributes('aria-label')).toBe('对话消息')
    expect(userMessage.classes()).toContain('chat-message--user')
    expect(userMessage.text()).toContain('YOU')
    expect(userMessage.text()).toContain('问题')
    expect(userMessage.find('button[aria-label="复制回答"]').exists()).toBe(false)
    expect(assistantMessage.classes()).toContain('chat-message--assistant')
    expect(assistantMessage.text()).toContain('APRIL AI')
    expect(assistantMessage.text()).toContain('回答')
    expect(assistantMessage.get('summary').text()).toBe('查看 1 条引用来源')
    expect(assistantMessage.text()).toContain('来源标题')
    expect(assistantMessage.text()).toContain('来源摘要')
  })

  it('用 MDC 渲染 Markdown 内容，并为无内容的助手显示思考状态', async () => {
    const wrapper = await mountMessageList([
      { id: 'a1', role: 'assistant', content: '## 二级标题\n\n**重点**', status: 'complete' },
      { id: 'a2', role: 'assistant', content: '', status: 'streaming' },
    ])

    const messages = wrapper.findAll('[data-role="assistant"]')

    expect(messages[0]!.get('h2').text()).toBe('二级标题')
    expect(messages[0]!.get('strong').text()).toBe('重点')
    expect(messages[1]!.text()).toContain('正在思考…')
    expect(messages[1]!.find('button[aria-label="复制回答"]').exists()).toBe(false)
  })

  it('复制助手的原始 Markdown 回答并显示成功状态', async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined)
    stubClipboard(writeText)
    const rawContent = '**原始回答**'
    const wrapper = await mountMessageList([
      { id: 'a1', role: 'assistant', content: rawContent, status: 'complete' },
    ])

    const copyButton = wrapper.get('button[aria-label="复制回答"]')
    await copyButton.trigger('click')
    await flushPromises()

    expect(writeText).toHaveBeenCalledWith(rawContent)
    expect(copyButton.text()).toBe('已复制')
  })

  it('剪贴板拒绝时提供可访问反馈且不显示复制成功', async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>().mockRejectedValue(new Error('denied'))
    stubClipboard(writeText)
    const wrapper = await mountMessageList([
      { id: 'a1', role: 'assistant', content: '回答', status: 'complete' },
    ])

    const copyButton = wrapper.get('button[aria-label="复制回答"]')
    await copyButton.trigger('click')
    await flushPromises()

    expect(writeText).toHaveBeenCalledWith('回答')
    expect(copyButton.text()).toBe('复制')
    expect(wrapper.get('[role="status"]').text()).toContain('复制失败，请手动复制')
  })

  it('展示已停止和生成失败状态', async () => {
    const wrapper = await mountMessageList([
      { id: 'a1', role: 'assistant', content: '部分回答', status: 'stopped' },
      { id: 'a2', role: 'assistant', content: '失败前内容', status: 'error' },
    ])

    expect(wrapper.text()).toContain('已停止生成')
    expect(wrapper.text()).toContain('回答生成失败')
  })

  it('消息内容变化后平滑滚动到底部', async () => {
    const wrapper = await mountMessageList([
      { id: 'a1', role: 'assistant', content: '回答', status: 'streaming' },
    ])
    const list = wrapper.get('section.message-list').element as HTMLElement
    const scrollTo = vi.fn()
    Object.defineProperties(list, {
      scrollHeight: { configurable: true, value: 640 },
      scrollTo: { configurable: true, value: scrollTo },
    })

    await wrapper.setProps({
      messages: [{ id: 'a1', role: 'assistant', content: '回答继续', status: 'streaming' }],
    })
    await nextTick()

    expect(scrollTo).toHaveBeenCalledWith({ top: 640, behavior: 'smooth' })
  })

  it('逐条跟踪消息内容，拼接结果相同时仍触发滚动', async () => {
    const wrapper = await mountMessageList([
      { id: 'a1', role: 'assistant', content: '回答继续', status: 'streaming' },
      { id: 'u1', role: 'user', content: '吗', status: 'complete' },
    ])
    const list = wrapper.get('section.message-list').element as HTMLElement
    const scrollTo = vi.fn()
    Object.defineProperties(list, {
      scrollHeight: { configurable: true, value: 720 },
      scrollTo: { configurable: true, value: scrollTo },
    })

    await wrapper.setProps({
      messages: [
        { id: 'a1', role: 'assistant', content: '回答', status: 'streaming' },
        { id: 'u1', role: 'user', content: '继续吗', status: 'complete' },
      ],
    })
    await nextTick()

    expect(scrollTo).toHaveBeenCalledWith({ top: 720, behavior: 'smooth' })
  })
})

describe('ChatStatusNotice', () => {
  it('展示错误消息并触发重试', async () => {
    const wrapper = await mountSuspended(ChatStatusNotice, {
      props: { message: '网络中断' },
    })
    mountedWrappers.add(wrapper)

    const alert = wrapper.get('[role="alert"]')
    expect(alert.text()).toContain('网络中断')

    const retryButton = alert.get('button')
    expect(retryButton.text()).toBe('重新发送')
    expect(retryButton.attributes('type')).toBe('button')
    await retryButton.trigger('click')

    expect(wrapper.emitted('retry')).toEqual([[]])
  })
})
