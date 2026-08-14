import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ProsePre from '~/components/content/ProsePre.vue'

const wrappers = new Set<{ unmount: () => void }>()

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  for (const wrapper of wrappers)
    wrapper.unmount()
  wrappers.clear()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

async function mountBlock(code = 'npm install example') {
  const wrapper = await mountSuspended(ProsePre, {
    props: { code, language: 'bash', filename: 'Terminal' },
    slots: { default: `<code>${code}</code>` },
  })
  wrappers.add(wrapper)
  return wrapper
}

function setClipboard(value: { writeText: (text: string) => Promise<void> } | undefined) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value,
  })
}

describe('ProsePre', () => {
  it('复制原始代码并在两秒后恢复按钮文本', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    setClipboard({ writeText })
    const wrapper = await mountBlock('codex mcp list')

    expect(wrapper.get('pre').text()).toContain('codex mcp list')
    expect(wrapper.get('[data-testid="code-language"]').text()).toBe('Terminal')

    const button = wrapper.get('button')
    await button.trigger('click')
    await flushPromises()

    expect(writeText).toHaveBeenCalledWith('codex mcp list')
    expect(button.text()).toBe('已复制')

    vi.advanceTimersByTime(2000)
    await flushPromises()
    expect(button.text()).toBe('复制')
  })

  it('Clipboard API 拒绝时显示失败且保留代码', async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error('denied')) })
    const wrapper = await mountBlock()

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(wrapper.get('button').text()).toBe('复制失败')
    expect(wrapper.get('pre').text()).toContain('npm install example')
  })

  it('没有 Clipboard API 时使用 textarea 回退并清理节点', async () => {
    setClipboard(undefined)
    const execCommand = vi.fn().mockReturnValue(true)
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    })
    const wrapper = await mountBlock('fallback command')

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(wrapper.get('button').text()).toBe('已复制')
    expect(document.querySelector('textarea[data-copy-fallback]')).toBeNull()
  })
})
