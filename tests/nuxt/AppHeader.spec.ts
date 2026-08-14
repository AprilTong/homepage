import { mountSuspended } from '@nuxt/test-utils/runtime'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AppHeader from '~/components/AppHeader.vue'

const mountedWrappers = new Set<{ unmount: () => void }>()

afterEach(() => {
  for (const wrapper of mountedWrappers) {
    wrapper.unmount()
  }

  mountedWrappers.clear()
})

async function mountHeader(path = '/') {
  const wrapper = await mountSuspended(AppHeader, {
    route: path,
  })

  mountedWrappers.add(wrapper)
  return wrapper
}

describe('AppHeader', () => {
  it('滚动时固定在页面顶部', async () => {
    const stylesheet = await readFile(resolve(process.cwd(), 'app/assets/css/main.css'), 'utf8')

    expect(stylesheet).toMatch(/\.app-header\s*\{[^}]*position:\s*sticky/s)
    expect(stylesheet).toMatch(/\.app-header\s*\{[^}]*top:\s*12px/s)
  })

  it('展示品牌与全部导航入口', async () => {
    const wrapper = await mountHeader()

    const brand = wrapper.get('[data-testid="brand"]')
    expect(brand.text()).toContain('april的记录小屋')
    expect(brand.classes()).toContain('brand')
    expect(brand.attributes('href')).toBe('/')
    expect(brand.attributes('aria-label')).toBe('April 博客首页')
    expect(brand.get('.brand__mark').text()).toBe('A')
    expect(brand.get('.brand__mark').attributes('aria-hidden')).toBe('true')

    for (const [href, label] of [
      ['/', 'Chat'],
      ['/timeline', '文章'],
      ['/ai-tools', 'AI 工具'],
      ['/about', '关于'],
    ]) {
      expect(wrapper.get(`#primary-navigation a[href="${href}"]`).text()).toBe(label)
    }

    const githubLink = wrapper.get('a[href="https://github.com/AprilTong"]')
    expect(githubLink.text()).toBe('GitHub ↗')
    expect(githubLink.attributes('target')).toBe('_blank')
    expect(githubLink.attributes('rel')).toBe('noreferrer')
  })

  it('Chat 入口使用站内 Nuxt 路由', async () => {
    const wrapper = await mountHeader()
    const chatLink = wrapper.findAllComponents({ name: 'NuxtLink' })
      .find(link => link.props('to') === '/')

    expect(chatLink).toBeDefined()
    expect(chatLink?.props('external')).toBeFalsy()
  })

  it('关于入口使用站内 Nuxt 路由', async () => {
    const wrapper = await mountHeader()
    const aboutLink = wrapper.findAllComponents({ name: 'NuxtLink' })
      .find(link => link.props('to') === '/about')

    expect(aboutLink).toBeDefined()
    expect(aboutLink?.props('external')).toBeFalsy()
  })

  it('点击菜单按钮切换导航展开状态', async () => {
    const wrapper = await mountHeader()
    const toggle = wrapper.get('.menu-toggle')
    const navigation = wrapper.get('#primary-navigation')

    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(navigation.classes()).not.toContain('is-open')

    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(navigation.classes()).toContain('is-open')

    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(navigation.classes()).not.toContain('is-open')
  })

  it('按下 Escape 时关闭导航', async () => {
    const wrapper = await mountHeader()
    const toggle = wrapper.get('.menu-toggle')
    const focus = vi.spyOn(toggle.element as HTMLButtonElement, 'focus')

    await toggle.trigger('click')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()

    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(wrapper.get('#primary-navigation').classes()).not.toContain('is-open')
    expect(focus).toHaveBeenCalledOnce()
  })

  it('点击导航链接后关闭菜单', async () => {
    const wrapper = await mountHeader()
    const toggle = wrapper.get('.menu-toggle')

    await toggle.trigger('click')
    const chatLink = wrapper.get('#primary-navigation a[href="/"]')
    await chatLink.trigger('click')

    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(wrapper.get('#primary-navigation').classes()).not.toContain('is-open')
  })

  it('卸载时移除同一个全局 keydown 监听器', async () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

    try {
      const wrapper = await mountHeader()
      const keydownHandler = addEventListenerSpy.mock.calls.find(
        ([eventName]) => String(eventName) === 'keydown',
      )?.[1]

      expect(keydownHandler).toBeTypeOf('function')

      mountedWrappers.delete(wrapper)
      wrapper.unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', keydownHandler)
    }
    finally {
      addEventListenerSpy.mockRestore()
      removeEventListenerSpy.mockRestore()
    }
  })
})

  it('在 Chat 路由标记 Chat 为选中状态', async () => {
    const wrapper = await mountHeader('/')
    const chatLink = wrapper.get('#primary-navigation a[href="/"]')

    expect(chatLink.classes()).toContain('is-active')
    expect(chatLink.attributes('aria-current')).toBe('page')
  })

  it('在关于与文章路由标记对应入口为选中状态', async () => {
    const aboutWrapper = await mountHeader('/about')
    expect(aboutWrapper.get('#primary-navigation a[href="/about"]').classes()).toContain('is-active')

    aboutWrapper.unmount()
    mountedWrappers.delete(aboutWrapper)

    const articleWrapper = await mountHeader('/articles')
    expect(articleWrapper.get('#primary-navigation a[href="/timeline"]').classes()).toContain('is-active')
  })

  it('在 AI 工具列表和详情路由标记 AI 工具入口为选中状态', async () => {
    const listWrapper = await mountHeader('/ai-tools')
    const listLink = listWrapper.get('#primary-navigation a[href="/ai-tools"]')

    expect(listLink.classes()).toContain('is-active')
    expect(listLink.attributes('aria-current')).toBe('page')
    expect(listWrapper.get('#primary-navigation a[href="/"]').attributes('aria-current')).toBeUndefined()

    listWrapper.unmount()
    mountedWrappers.delete(listWrapper)

    const detailWrapper = await mountHeader('/ai-tools/context7')
    const detailLink = detailWrapper.get('#primary-navigation a[href="/ai-tools"]')

    expect(detailLink.classes()).toContain('is-active')
    expect(detailLink.attributes('aria-current')).toBe('page')
  })
