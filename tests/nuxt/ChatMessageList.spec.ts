import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
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

function deferredPromise() {
  let resolve!: () => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, resolve, reject }
}

interface ResizeObserverDouble {
  callback: ResizeObserverCallback
  observe: ReturnType<typeof vi.fn>
  disconnect: ReturnType<typeof vi.fn>
}

interface MutationObserverDouble {
  callback: MutationCallback
  observe: ReturnType<typeof vi.fn>
  disconnect: ReturnType<typeof vi.fn>
}

function stubResizeObserver() {
  const observers: ResizeObserverDouble[] = []

  class ResizeObserverMock {
    callback: ResizeObserverCallback
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback
      observers.push(this)
    }
  }

  vi.stubGlobal('ResizeObserver', ResizeObserverMock)
  return observers
}

function stubMutationObserver() {
  const observers: MutationObserverDouble[] = []

  class MutationObserverMock {
    callback: MutationCallback
    observe = vi.fn()
    takeRecords = vi.fn(() => [])
    disconnect = vi.fn()

    constructor(callback: MutationCallback) {
      this.callback = callback
      observers.push(this)
    }
  }

  vi.stubGlobal('MutationObserver', MutationObserverMock)
  return observers
}

function stubReducedMotion(matches: boolean) {
  vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })))
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

    expect(list.attributes('aria-live')).toBeUndefined()
    expect(list.attributes('aria-busy')).toBe('false')
    expect(list.attributes('aria-label')).toBe('对话消息')
    expect(wrapper.get('.message-list__announcement').text()).toBe('回答生成完成')
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

  it('每次仅显示一条引用来源，并支持左右切换', async () => {
    const wrapper = await mountMessageList([
      {
        id: 'a1',
        role: 'assistant',
        content: '回答',
        status: 'complete',
        citations: [
          { id: 'c1', title: '来源一', excerpt: '摘要一' },
          { id: 'c2', title: '来源二', excerpt: '摘要二' },
          { id: 'c3', title: '来源三', excerpt: '摘要三' },
        ],
      },
    ])

    const citations = wrapper.get('.chat-message__citations')
    const previous = citations.get('button[aria-label="上一条引用"]')
    const next = citations.get('button[aria-label="下一条引用"]')

    expect(citations.findAll('.citation')).toHaveLength(1)
    expect(citations.text()).toContain('来源一')
    expect(citations.text()).not.toContain('来源二')
    expect(citations.get('.citation-carousel__position').text()).toBe('1 / 3')
    expect(previous.attributes('disabled')).toBeDefined()

    await next.trigger('click')

    expect(citations.findAll('.citation')).toHaveLength(1)
    expect(citations.text()).toContain('来源二')
    expect(citations.text()).not.toContain('来源一')
    expect(citations.get('.citation-carousel__position').text()).toBe('2 / 3')
    expect(previous.attributes('disabled')).toBeUndefined()

    await next.trigger('click')

    expect(citations.text()).toContain('来源三')
    expect(next.attributes('disabled')).toBeDefined()
  })

  it('所有消息以安全的纯文本显示，且保留换行与 Markdown 原文', async () => {
    const wrapper = await mountMessageList([
      { id: 'u1', role: 'user', content: '<strong>用户原文</strong> **不渲染**', status: 'complete' },
      { id: 'a1', role: 'assistant', content: '## 二级标题\n\n**重点**', status: 'complete' },
      { id: 'a2', role: 'assistant', content: '**增量回答**', status: 'streaming' },
      { id: 'a3', role: 'assistant', content: '', status: 'streaming' },
    ])

    const userMessage = wrapper.get('[data-role="user"]')
    const messages = wrapper.findAll('[data-role="assistant"]')

    expect(userMessage.find('strong').exists()).toBe(false)
    expect(userMessage.text()).toContain('<strong>用户原文</strong> **不渲染**')
    expect(messages[0]!.find('h2').exists()).toBe(false)
    expect(messages[0]!.find('strong').exists()).toBe(false)
    expect(messages[0]!.text()).toContain('## 二级标题')
    expect(messages[0]!.text()).toContain('**重点**')
    expect(messages[1]!.text()).toContain('**增量回答**')
    expect(messages[2]!.text()).toContain('正在思考…')
  })

  it('终态助手将原始 HTML、MDC 组件和链接作为文本显示', async () => {
    const injectedComponentSetup = vi.fn()
    const InjectedChatStatusNotice = defineComponent({
      name: 'ChatStatusNotice',
      setup() {
        injectedComponentSetup()
        return () => h('div', { 'data-testid': 'injected-mdc-component' })
      },
    })
    const wrapper = await mountSuspended(ChatMessageList, {
      props: {
        messages: [{
          id: 'a1',
          role: 'assistant',
          status: 'complete',
          content: [
            '<iframe src="https://evil.example"></iframe>',
            '<script>alert(1)</script>',
            '<img src="x" onerror="alert(1)">',
            '::ChatStatusNotice{message="被实例化"}',
            '',
            '[脚本链接](javascript:alert(1))',
            '[数据链接](data:text/html;base64,PHNjcmlwdD4=)',
            '[安全链接](https://example.com/docs)',
            '',
            '**安全加粗** 和 `安全代码`',
          ].join('\n\n'),
        }],
      },
      global: {
        components: {
          ChatStatusNotice: InjectedChatStatusNotice,
        },
      },
    })
    mountedWrappers.add(wrapper)
    const assistantMessage = wrapper.get('[data-role="assistant"]')

    expect(assistantMessage.find('iframe').exists()).toBe(false)
    expect(assistantMessage.find('script').exists()).toBe(false)
    expect(assistantMessage.find('img').exists()).toBe(false)
    expect(assistantMessage.find('.status-notice').exists()).toBe(false)
    expect(assistantMessage.find('[role="alert"]').exists()).toBe(false)
    expect(assistantMessage.find('[data-testid="injected-mdc-component"]').exists()).toBe(false)
    expect(injectedComponentSetup).not.toHaveBeenCalled()

    expect(assistantMessage.findAll('a')).toHaveLength(0)
    expect(assistantMessage.find('strong').exists()).toBe(false)
    expect(assistantMessage.find('code').exists()).toBe(false)
    expect(assistantMessage.text()).toContain('[安全链接](https://example.com/docs)')
    expect(assistantMessage.text()).toContain('**安全加粗** 和 `安全代码`')
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
    expect(wrapper.get('.chat-message__copy-status[role="status"]').text()).toBe('已复制')
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
    expect(wrapper.get('.chat-message__copy-status[role="status"]').text())
      .toContain('复制失败，请手动复制')
  })

  it('展示已停止和生成失败状态', async () => {
    const wrapper = await mountMessageList([
      { id: 'a1', role: 'assistant', content: '部分回答', status: 'stopped' },
      { id: 'a2', role: 'assistant', content: '失败前内容', status: 'error' },
    ])

    expect(wrapper.text()).toContain('已停止生成')
    expect(wrapper.text()).toContain('回答生成失败')
  })

  it('仅为空的流式助手显示思考状态', async () => {
    const wrapper = await mountMessageList([
      { id: 'a1', role: 'assistant', content: '', status: 'streaming' },
      { id: 'a2', role: 'assistant', content: '', status: 'stopped' },
      { id: 'a3', role: 'assistant', content: '', status: 'error' },
    ])
    const messages = wrapper.findAll('[data-role="assistant"]')

    expect(messages[0]!.text()).toContain('正在思考…')
    expect(messages[1]!.text()).not.toContain('正在思考…')
    expect(messages[1]!.text()).toContain('已停止生成')
    expect(messages[2]!.text()).not.toContain('正在思考…')
    expect(messages[2]!.text()).toContain('回答生成失败')
  })

  it('流式助手不开放复制', async () => {
    const wrapper = await mountMessageList([
      { id: 'a1', role: 'assistant', content: '仍在生成', status: 'streaming' },
    ])

    expect(wrapper.find('button[aria-label="复制回答"]').exists()).toBe(false)
  })

  it('只播报生成状态，不把每个流式增量放入 live region', async () => {
    const messages = ref<ChatMessage[]>([
      { id: 'a1', role: 'assistant', content: '第一段', status: 'streaming' },
    ])
    const wrapper = await mountSuspended(defineComponent({
      setup: () => () => h(ChatMessageList, { messages: messages.value }),
    }))
    mountedWrappers.add(wrapper)
    const list = wrapper.get('section.message-list')
    const announcement = wrapper.get('.message-list__announcement')

    expect(list.attributes('aria-live')).toBeUndefined()
    expect(list.attributes('aria-busy')).toBe('true')
    expect(announcement.attributes('role')).toBe('status')
    expect(announcement.attributes('aria-live')).toBe('polite')
    expect(announcement.attributes('aria-atomic')).toBe('true')
    expect(announcement.text()).toBe('正在生成回答')

    messages.value[0]!.content = '第一段和第二段'
    await nextTick()

    expect(announcement.text()).toBe('正在生成回答')
    expect(announcement.text()).not.toContain('第一段和第二段')

    messages.value[0]!.status = 'complete'
    await nextTick()

    expect(list.attributes('aria-busy')).toBe('false')
    expect(announcement.text()).toBe('回答生成完成')
  })

  it('内容变化后忽略过期复制结果且反馈互斥', async () => {
    const firstCopy = deferredPromise()
    const secondCopy = deferredPromise()
    const writeText = vi.fn<(text: string) => Promise<void>>()
      .mockImplementationOnce(() => firstCopy.promise)
      .mockImplementationOnce(() => secondCopy.promise)
    stubClipboard(writeText)
    const wrapper = await mountMessageList([
      { id: 'a1', role: 'assistant', content: '旧回答', status: 'complete' },
    ])

    const firstButton = wrapper.get('button[aria-label="复制回答"]')
    await firstButton.trigger('click')
    expect(firstButton.attributes()).toHaveProperty('disabled')
    expect(firstButton.text()).toBe('复制中…')

    await wrapper.setProps({
      messages: [{ id: 'a1', role: 'assistant', content: '新回答', status: 'complete' }],
    })
    await nextTick()

    const secondButton = wrapper.get('button[aria-label="复制回答"]')
    expect(secondButton.text()).toBe('复制')
    await secondButton.trigger('click')
    secondCopy.resolve()
    await flushPromises()
    expect(wrapper.get('.chat-message__copy-status[role="status"]').text()).toBe('已复制')

    firstCopy.reject(new Error('late failure'))
    await flushPromises()

    expect(wrapper.findAll('.chat-message__copy-status[role="status"]')).toHaveLength(1)
    expect(wrapper.get('.chat-message__copy-status[role="status"]').text()).toBe('已复制')
    expect(writeText).toHaveBeenNthCalledWith(1, '旧回答')
    expect(writeText).toHaveBeenNthCalledWith(2, '新回答')
  })

  it('消息内容变化后平滑滚动到底部', async () => {
    vi.stubGlobal('ResizeObserver', undefined)
    vi.stubGlobal('MutationObserver', undefined)
    const wrapper = await mountMessageList([
      { id: 'a1', role: 'assistant', content: '回答', status: 'streaming' },
    ])
    const list = wrapper.get('section.message-list').element as HTMLElement
    const scrollTo = vi.fn()
    Object.defineProperty(list, 'scrollTo', { configurable: true, value: scrollTo })

    await wrapper.setProps({
      messages: [{ id: 'a1', role: 'assistant', content: '回答继续', status: 'streaming' }],
    })
    await nextTick()

    expect(scrollTo).toHaveBeenCalledWith({ top: list.scrollHeight, behavior: 'auto' })
  })

  it('逐条跟踪消息内容，拼接结果相同时仍触发滚动', async () => {
    vi.stubGlobal('ResizeObserver', undefined)
    vi.stubGlobal('MutationObserver', undefined)
    const wrapper = await mountMessageList([
      { id: 'a1', role: 'assistant', content: '回答继续', status: 'streaming' },
      { id: 'u1', role: 'user', content: '吗', status: 'complete' },
    ])
    const list = wrapper.get('section.message-list').element as HTMLElement
    const scrollTo = vi.fn()
    Object.defineProperty(list, 'scrollTo', { configurable: true, value: scrollTo })

    await wrapper.setProps({
      messages: [
        { id: 'a1', role: 'assistant', content: '回答', status: 'streaming' },
        { id: 'u1', role: 'user', content: '继续吗', status: 'complete' },
      ],
    })
    await nextTick()

    expect(scrollTo).toHaveBeenCalledWith({ top: list.scrollHeight, behavior: 'auto' })
  })

  it('观察器均不可用时在终态和引用变化后滚动', async () => {
    vi.stubGlobal('ResizeObserver', undefined)
    vi.stubGlobal('MutationObserver', undefined)
    const messages = ref<ChatMessage[]>([
      { id: 'a1', role: 'assistant', content: '回答', status: 'streaming' },
    ])
    const wrapper = await mountSuspended(defineComponent({
      setup: () => () => h(ChatMessageList, { messages: messages.value }),
    }))
    mountedWrappers.add(wrapper)
    const list = wrapper.get('section.message-list').element as HTMLElement
    const scrollTo = vi.fn()
    Object.defineProperty(list, 'scrollTo', { configurable: true, value: scrollTo })

    messages.value[0]!.status = 'complete'
    messages.value[0]!.citations = [{ id: 'c1', title: '引用标题', excerpt: '引用摘要' }]
    await nextTick()
    await flushPromises()

    expect(scrollTo).toHaveBeenCalledWith({ top: list.scrollHeight, behavior: 'smooth' })
  })

  it('无 ResizeObserver 时等待完成态内容变化后滚动到新高度', async () => {
    vi.stubGlobal('ResizeObserver', undefined)
    const observers = stubMutationObserver()
    const wrapper = await mountMessageList([
      { id: 'a1', role: 'assistant', content: '**完整回答**', status: 'streaming' },
    ])
    const list = wrapper.get('section.message-list').element as HTMLElement
    const content = wrapper.get('.message-list__content').element
    const scrollTo = vi.fn()
    let renderedHeight = 120
    Object.defineProperties(list, {
      scrollHeight: { configurable: true, get: () => renderedHeight },
      scrollTo: { configurable: true, value: scrollTo },
    })

    expect(observers).toHaveLength(1)
    expect(observers[0]!.observe).toHaveBeenCalledWith(content, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    await wrapper.setProps({
      messages: [{
        id: 'a1',
        role: 'assistant',
        content: '**完整回答**',
        status: 'complete',
        citations: [{ id: 'c1', title: '引用标题', excerpt: '引用摘要' }],
      }],
    })
    await flushPromises()

    expect(wrapper.get('.chat-message__content').text()).toBe('**完整回答**')
    expect(wrapper.get('summary').text()).toBe('查看 1 条引用来源')
    expect(scrollTo).not.toHaveBeenCalled()

    renderedHeight = 480
    observers[0]!.callback([], {} as MutationObserver)

    expect(scrollTo).toHaveBeenCalledOnce()
    expect(scrollTo).toHaveBeenCalledWith({ top: 480, behavior: 'smooth' })

    wrapper.unmount()
    mountedWrappers.delete(wrapper)
    expect(observers[0]!.disconnect).toHaveBeenCalledOnce()
  })

  it('ResizeObserver 可用时内容更新不会由 watch 重复滚动', async () => {
    const observers = stubResizeObserver()
    const wrapper = await mountMessageList([
      { id: 'a1', role: 'assistant', content: '回答', status: 'streaming' },
    ])
    const list = wrapper.get('section.message-list').element as HTMLElement
    const content = wrapper.get('.message-list__content').element
    const scrollTo = vi.fn()
    Object.defineProperty(list, 'scrollTo', { configurable: true, value: scrollTo })

    expect(observers).toHaveLength(1)
    expect(observers[0]!.observe).toHaveBeenCalledWith(list)
    expect(observers[0]!.observe).toHaveBeenCalledWith(content)

    await wrapper.setProps({
      messages: [{ id: 'a1', role: 'assistant', content: '回答继续', status: 'streaming' }],
    })
    await nextTick()

    expect(scrollTo).not.toHaveBeenCalled()

    observers[0]!.callback([], {} as ResizeObserver)

    expect(scrollTo).toHaveBeenCalledOnce()
    expect(scrollTo).toHaveBeenCalledWith({ top: list.scrollHeight, behavior: 'auto' })
  })

  it('用户上滚阅读时停止跟随，回到底部附近后恢复', async () => {
    const observers = stubResizeObserver()
    const wrapper = await mountMessageList([
      { id: 'a1', role: 'assistant', content: '正在生成的长回答', status: 'streaming' },
    ])
    const listWrapper = wrapper.get('section.message-list')
    const list = listWrapper.element as HTMLElement
    const scrollTo = vi.fn()
    let scrollTop = 700

    Object.defineProperties(list, {
      clientHeight: { configurable: true, get: () => 300 },
      scrollHeight: { configurable: true, get: () => 1000 },
      scrollTop: {
        configurable: true,
        get: () => scrollTop,
        set: value => {
          scrollTop = Number(value)
        },
      },
      scrollTo: { configurable: true, value: scrollTo },
    })

    await listWrapper.trigger('wheel', { deltaY: -120 })
    scrollTop = 240
    await listWrapper.trigger('scroll')
    observers[0]!.callback([], {} as ResizeObserver)

    expect(scrollTo).not.toHaveBeenCalled()

    scrollTop = 680
    await listWrapper.trigger('scroll')
    observers[0]!.callback([], {} as ResizeObserver)

    expect(scrollTo).toHaveBeenCalledOnce()
    expect(scrollTo).toHaveBeenCalledWith({ top: 1000, behavior: 'auto' })
  })

  it('减少动态效果时使用即时滚动并在卸载时断开观察', async () => {
    stubReducedMotion(true)
    const observers = stubResizeObserver()
    const wrapper = await mountMessageList([
      { id: 'a1', role: 'assistant', content: '回答', status: 'complete' },
    ])
    const list = wrapper.get('section.message-list').element as HTMLElement
    const scrollTo = vi.fn()
    Object.defineProperty(list, 'scrollTo', { configurable: true, value: scrollTo })

    observers[0]!.callback([], {} as ResizeObserver)

    expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)')
    expect(scrollTo).toHaveBeenCalledWith({ top: list.scrollHeight, behavior: 'auto' })

    wrapper.unmount()
    mountedWrappers.delete(wrapper)
    expect(observers[0]!.disconnect).toHaveBeenCalledOnce()
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
