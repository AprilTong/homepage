import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ChatComposer from '~/components/chat/ChatComposer.vue'

const mountedWrappers = new Set<{ unmount: () => void }>()

afterEach(() => {
  for (const wrapper of mountedWrappers) {
    wrapper.unmount()
  }

  mountedWrappers.clear()
  vi.unstubAllGlobals()
})

async function mountComposer(streaming = false) {
  const wrapper = await mountSuspended(ChatComposer, {
    props: { streaming },
  })

  mountedWrappers.add(wrapper)
  return wrapper
}

function mockCoarsePointer(matches: boolean) {
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

describe('ChatComposer', () => {
  it('提交时去除首尾空白、发送问题并清空，空白问题不发送', async () => {
    const wrapper = await mountComposer()
    const textarea = wrapper.get('textarea')
    const form = wrapper.get('form.chat-composer')

    expect(form.attributes('aria-label')).toBe('发送问题')
    expect(textarea.attributes('rows')).toBe('1')
    expect(textarea.attributes('placeholder')).toBe('输入问题，Enter 发送…')
    expect(textarea.attributes('aria-label')).toBe('输入问题')

    await textarea.setValue('  浏览器指纹是什么？  ')
    await form.trigger('submit')

    expect(wrapper.emitted('send')).toEqual([['浏览器指纹是什么？']])
    expect((textarea.element as HTMLTextAreaElement).value).toBe('')

    await textarea.setValue('   ')
    expect(wrapper.get('button[aria-label="发送问题"]').attributes()).toHaveProperty('disabled')
    await form.trigger('submit')

    expect(wrapper.emitted('send')).toEqual([['浏览器指纹是什么？']])
  })

  it('流式生成时禁用输入并允许停止生成', async () => {
    const wrapper = await mountComposer(true)
    const textarea = wrapper.get('textarea')
    const stopButton = wrapper.get('button[aria-label="停止生成"]')

    expect(textarea.attributes()).toHaveProperty('disabled')
    expect(stopButton.attributes('type')).toBe('button')
    expect(wrapper.find('button[aria-label="发送问题"]').exists()).toBe(false)

    await stopButton.trigger('click')

    expect(wrapper.emitted('stop')).toEqual([[]])
  })

  it('桌面环境按 Enter 发送，按 Shift+Enter 不发送', async () => {
    mockCoarsePointer(false)
    const wrapper = await mountComposer()
    const textarea = wrapper.get('textarea')

    await textarea.setValue('保留换行')
    await textarea.trigger('keydown', { key: 'Enter', shiftKey: true })

    expect(wrapper.emitted('send')).toBeUndefined()
    expect((textarea.element as HTMLTextAreaElement).value).toBe('保留换行')

    await textarea.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('send')).toEqual([['保留换行']])
    expect((textarea.element as HTMLTextAreaElement).value).toBe('')
  })

  it('粗指针环境按 Enter 不发送，但发送按钮仍可提交', async () => {
    mockCoarsePointer(true)
    const wrapper = await mountComposer()
    const textarea = wrapper.get('textarea')

    await textarea.setValue('移动端问题')
    await textarea.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('send')).toBeUndefined()

    const sendButton = wrapper.get('button[aria-label="发送问题"]')
    expect(sendButton.attributes('type')).toBe('submit')
    expect(sendButton.attributes()).not.toHaveProperty('disabled')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.emitted('send')).toEqual([['移动端问题']])
  })
})
