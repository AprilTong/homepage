import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AppHeader from '~/components/AppHeader.vue'

enableAutoUnmount(afterEach)

function mountHeader() {
  const routeComponent = { render: () => null }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: routeComponent },
      { path: '/articles', component: routeComponent },
      { path: '/timeline', component: routeComponent },
      { path: '/about', component: routeComponent },
    ],
  })

  return mountSuspended(AppHeader, {
    route: false,
    global: { plugins: [router] },
  })
}

describe('AppHeader', () => {
  it('展示品牌与全部导航入口', async () => {
    const wrapper = await mountHeader()

    const brand = wrapper.get('[data-testid="brand"]')
    expect(brand.text()).toContain('april.dev')
    expect(brand.classes()).toContain('brand')
    expect(brand.attributes('href')).toBe('/')
    expect(brand.attributes('aria-label')).toBe('April 博客首页')
    expect(brand.get('.brand__mark').text()).toBe('A')
    expect(brand.get('.brand__mark').attributes('aria-hidden')).toBe('true')

    for (const [href, label] of [
      ['/articles', '文章'],
      ['/timeline', '时间轴'],
      ['/about', '关于'],
    ]) {
      expect(wrapper.get(`a[href="${href}"]`).text()).toBe(label)
    }

    const githubLink = wrapper.get('a[href="https://github.com/AprilTong"]')
    expect(githubLink.text()).toBe('GitHub ↗')
    expect(githubLink.attributes('target')).toBe('_blank')
    expect(githubLink.attributes('rel')).toBe('noreferrer')
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

    await toggle.trigger('click')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()

    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(wrapper.get('#primary-navigation').classes()).not.toContain('is-open')
  })

  it('点击导航链接后关闭菜单', async () => {
    const wrapper = await mountHeader()
    const toggle = wrapper.get('.menu-toggle')

    await toggle.trigger('click')
    const articleLink = wrapper.get('a[href="/articles"]')
    await articleLink.trigger('click')

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

      wrapper.unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', keydownHandler)
    }
    finally {
      addEventListenerSpy.mockRestore()
      removeEventListenerSpy.mockRestore()
    }
  })
})
