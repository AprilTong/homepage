import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it } from 'vitest'

import ChatWelcome from '~/components/chat/ChatWelcome.vue'

const mountedWrappers = new Set<{ unmount: () => void }>()

afterEach(() => {
  for (const wrapper of mountedWrappers) {
    wrapper.unmount()
  }

  mountedWrappers.clear()
})

async function mountWelcome() {
  const wrapper = await mountSuspended(ChatWelcome)
  mountedWrappers.add(wrapper)
  return wrapper
}

describe('ChatWelcome', () => {
  it('展示欢迎文案与三个快捷问题', async () => {
    const wrapper = await mountWelcome()
    const welcome = wrapper.get('section.chat-welcome')

    expect(welcome.attributes('aria-labelledby')).toBe('chat-title')
    expect(welcome.get('.ai-orb').attributes('aria-hidden')).toBe('true')
    expect(welcome.get('.ai-orb').text()).toBe('✦')
    expect(welcome.get('.eyebrow').text()).toBe('APRIL AI · KNOWLEDGE ONLINE')
    expect(welcome.get('h1#chat-title').text()).toBe('今天想了解什么？')
    expect(welcome.text()).toContain(
      '我会从 April 的技术笔记和知识文档中寻找答案，并提供可核对的引用来源。',
    )

    const quickPrompts = welcome.get('.quick-prompts')
    expect(quickPrompts.attributes('role')).toBe('group')
    expect(quickPrompts.attributes('aria-label')).toBe('快捷问题')

    const buttons = quickPrompts.findAll('[data-testid="quick-prompt"]')
    expect(buttons).toHaveLength(3)
    expect(buttons.map(button => button.text())).toEqual([
      '浏览器指纹是什么？',
      'axios 有哪些实用工具函数？',
      '推荐一条 Vue 学习路径。',
    ])
    expect(buttons.every(button => button.attributes('type') === 'button')).toBe(true)
  })

  it('点击快捷问题时发出原文', async () => {
    const wrapper = await mountWelcome()

    await wrapper.get('[data-testid="quick-prompt"]').trigger('click')

    expect(wrapper.emitted('select')).toEqual([['浏览器指纹是什么？']])
  })
})
