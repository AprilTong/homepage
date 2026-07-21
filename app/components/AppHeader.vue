<script setup lang="ts">
const isMenuOpen = ref(false)

function closeMenu() {
  isMenuOpen.value = false
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeMenu()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <header class="app-header">
    <NuxtLink
      to="/"
      class="brand"
      data-testid="brand"
      aria-label="April 博客首页"
    >
      <span class="brand__mark" aria-hidden="true">A</span>
      <span>april.dev</span>
    </NuxtLink>

    <button
      type="button"
      class="menu-toggle"
      aria-controls="primary-navigation"
      :aria-expanded="isMenuOpen"
      aria-label="切换导航菜单"
      @click="isMenuOpen = !isMenuOpen"
    >
      菜单
    </button>

    <nav
      id="primary-navigation"
      class="primary-nav"
      :class="{ 'is-open': isMenuOpen }"
      aria-label="主导航"
    >
      <NuxtLink to="/articles" @click="closeMenu">文章</NuxtLink>
      <NuxtLink to="/timeline" @click="closeMenu">时间轴</NuxtLink>
      <NuxtLink to="/about" @click="closeMenu">关于</NuxtLink>
      <a
        href="https://github.com/AprilTong"
        target="_blank"
        rel="noreferrer"
        @click="closeMenu"
      >
        GitHub ↗
      </a>
    </nav>
  </header>
</template>
